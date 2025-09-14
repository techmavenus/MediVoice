import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const Dashboard = ({ clinic, onLogout }) => {
  const [phoneInfo, setPhoneInfo] = useState(null);
  const [assistantInfo, setAssistantInfo] = useState(null);
  const [systemPromptPreview, setSystemPromptPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAreaCodeInput, setShowAreaCodeInput] = useState(false);
  const [areaCode, setAreaCode] = useState('689');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [phoneResponse, assistantResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/phone/info`, { headers }),
        axios.get(`${API_BASE_URL}/api/assistant/info`, { headers })
      ]);

      setPhoneInfo(phoneResponse.data.phone);
      setAssistantInfo(assistantResponse.data.assistant);

      // Fetch system prompt if assistant exists
      if (assistantResponse.data.assistant) {
        try {
          const promptResponse = await axios.get(`${API_BASE_URL}/api/assistant/prompt`, { headers });
          const fullPrompt = promptResponse.data.prompt;
          // Get first line (up to first newline or first 100 characters)
          const firstLine = fullPrompt.split('\n')[0].substring(0, 100);
          setSystemPromptPreview(firstLine);
        } catch (promptError) {
          console.error('Failed to fetch system prompt:', promptError);
          setSystemPromptPreview('');
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Token is invalid, logout user
        onLogout();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssistant = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/assistant/create`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Failed to create assistant:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        onLogout();
        return;
      }
      alert(error.response?.data?.error || 'Failed to create assistant');
    }
  };

  const handleProvisionPhone = async () => {
    try {
      setLoading(true); // Prevent multiple clicks
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/phone/provision`, {
        areaCode: areaCode
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData(); // Wait for data to refresh
      setShowAreaCodeInput(false);
    } catch (error) {
      console.error('Failed to provision phone:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        onLogout();
        return;
      }
      alert(error.response?.data?.error || 'Failed to provision phone number');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhone = async () => {
    if (!window.confirm('Are you sure you want to delete this phone number? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/phone/delete`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      alert('Phone number deleted successfully');
    } catch (error) {
      console.error('Failed to delete phone:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        onLogout();
        return;
      }
      alert('Failed to delete phone number');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                TechMaven Clinic Assistant
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{clinic?.clinic_name}</span>
              <button
                onClick={onLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header with Status Summary */}
          <div className="mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
                <p className="text-gray-600">Manage your AI assistant and phone services</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {clinic?.clinic_name}
                </div>
              </div>
            </div>

            {/* Quick Status Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{assistantInfo ? '✅' : '❌'}</span>
                    <span className="text-sm font-medium text-gray-700">Assistant</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{phoneInfo ? '✅' : '❌'}</span>
                    <span className="text-sm font-medium text-gray-700">Phone</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{systemPromptPreview ? '✅' : '❌'}</span>
                    <span className="text-sm font-medium text-gray-700">Prompt</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    Setup: {[assistantInfo, phoneInfo, systemPromptPreview].filter(Boolean).length}/3 Complete
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{width: `${([assistantInfo, phoneInfo, systemPromptPreview].filter(Boolean).length / 3) * 100}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Actions */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {!assistantInfo ? (
                <button
                  onClick={handleCreateAssistant}
                  className="group bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-dashed border-indigo-300 rounded-xl p-6 text-left hover:from-indigo-100 hover:to-indigo-200 hover:border-indigo-400 transition-all duration-200"
                >
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-indigo-200 rounded-lg flex items-center justify-center group-hover:bg-indigo-300 transition-colors">
                      <span className="text-xl">🤖</span>
                    </div>
                    <h3 className="ml-3 text-lg font-semibold text-gray-900">
                      Create Assistant
                    </h3>
                  </div>
                  <p className="text-gray-700">
                    Create your AI assistant to handle phone calls
                  </p>
                </button>
              ) : (
                <Link
                  to="/prompt"
                  className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200"
                >
                  <div className="flex items-center mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors ${systemPromptPreview ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <span className="text-xl">{systemPromptPreview ? '💬' : '📝'}</span>
                    </div>
                    <h3 className="ml-3 text-lg font-semibold text-gray-900">
                      System Prompt
                    </h3>
                  </div>
                  {systemPromptPreview ? (
                    <p className="text-sm text-gray-700 italic truncate mb-2">
                      "{systemPromptPreview}..."
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600 mb-2">
                      Not configured
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Click to configure
                  </p>
                </Link>
              )}

              <Link
                to="/knowledge"
                className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-green-300 transition-all duration-200"
              >
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <span className="text-xl">📚</span>
                  </div>
                  <h3 className="ml-3 text-lg font-semibold text-gray-900">
                    Knowledge Base
                  </h3>
                </div>
                <p className="text-gray-600">
                  Upload files
                </p>
              </Link>

              <div className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-purple-300 transition-all duration-200">
                {!phoneInfo ? (
                  <>
                    {!showAreaCodeInput ? (
                      <button
                        onClick={() => setShowAreaCodeInput(true)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                            <span className="text-xl">❌</span>
                          </div>
                          <h3 className="ml-3 text-lg font-semibold text-gray-900">
                            Phone Number
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Not provisioned
                        </p>
                        <p className="text-xs text-gray-500">
                          Click to get a number
                        </p>
                      </button>
                    ) : (
                      <div>
                        <div className="flex items-center mb-4">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <span className="text-xl">📞</span>
                          </div>
                          <h3 className="ml-3 text-lg font-semibold text-gray-900">
                            Choose Area Code
                          </h3>
                        </div>
                        <div className="mb-4">
                          <select
                            value={areaCode}
                            onChange={(e) => setAreaCode(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          >
                            <option value="689">689</option>
                            <option value="447">447</option>
                            <option value="539">539</option>
                          </select>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleProvisionPhone}
                            disabled={loading}
                            className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Getting...' : 'Get Number'}
                          </button>
                          <button
                            onClick={() => setShowAreaCodeInput(false)}
                            className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <span className="text-xl">📞</span>
                      </div>
                      <h3 className="ml-3 text-lg font-semibold text-gray-900">
                        Phone Number
                      </h3>
                    </div>
                    <p className="text-sm text-gray-700 font-mono mb-3">
                      {phoneInfo.phone_number}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowAreaCodeInput(true)}
                        disabled={loading}
                        className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        New Number
                      </button>
                      <button
                        onClick={handleDeletePhone}
                        className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                    {showAreaCodeInput && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="mb-3">
                          <select
                            value={areaCode}
                            onChange={(e) => setAreaCode(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          >
                            <option value="689">689</option>
                            <option value="447">447</option>
                            <option value="539">539</option>
                          </select>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleProvisionPhone}
                            disabled={loading}
                            className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Getting...' : 'Get Number'}
                          </button>
                          <button
                            onClick={() => setShowAreaCodeInput(false)}
                            className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <Link
                to="/calls"
                className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-orange-300 transition-all duration-200"
              >
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                    <span className="text-xl">📋</span>
                  </div>
                  <h3 className="ml-3 text-lg font-semibold text-gray-900">
                    Call Logs
                  </h3>
                </div>
                <p className="text-gray-600">
                  View incoming calls and conversation details
                </p>
              </Link>
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity / Next Steps */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
              <div className="space-y-3">
                {!assistantInfo && (
                  <div className="flex items-center p-3 bg-indigo-50 rounded-lg">
                    <span className="text-2xl mr-3">🤖</span>
                    <div>
                      <p className="text-sm font-medium text-indigo-900">Create your assistant</p>
                      <p className="text-xs text-indigo-700">Set up AI to handle phone calls</p>
                    </div>
                  </div>
                )}
                {assistantInfo && !systemPromptPreview && (
                  <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-2xl mr-3">💬</span>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Configure system prompt</p>
                      <p className="text-xs text-blue-700">Define how your assistant behaves</p>
                    </div>
                  </div>
                )}
                {assistantInfo && !phoneInfo && (
                  <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-2xl mr-3">📞</span>
                    <div>
                      <p className="text-sm font-medium text-purple-900">Get phone number</p>
                      <p className="text-xs text-purple-700">Provision a number for calls</p>
                    </div>
                  </div>
                )}
                {assistantInfo && systemPromptPreview && phoneInfo && (
                  <div className="flex items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-2xl mr-3">🎉</span>
                    <div>
                      <p className="text-sm font-medium text-green-900">Setup complete!</p>
                      <p className="text-xs text-green-700">Your assistant is ready to receive calls</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Info</h3>
              <div className="space-y-4">
                {phoneInfo && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                    <dd className="text-lg font-mono text-gray-900">{phoneInfo.phone_number}</dd>
                  </div>
                )}
                {systemPromptPreview && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Current System Prompt</dt>
                    <dd className="text-sm text-gray-700 italic bg-gray-50 p-3 rounded-md mt-1">
                      "{systemPromptPreview}..."
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Assistant Model</dt>
                  <dd className="text-sm text-gray-900">GPT-4o-mini with Nova voice</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Clinic</dt>
                  <dd className="text-sm text-gray-900">{clinic?.clinic_name}</dd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;