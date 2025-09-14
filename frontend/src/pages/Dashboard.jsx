import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const Dashboard = ({ clinic, onLogout }) => {
  const [phoneInfo, setPhoneInfo] = useState(null);
  const [assistantInfo, setAssistantInfo] = useState(null);
  const [systemPromptPreview, setSystemPromptPreview] = useState('');
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [callsLoading, setCallsLoading] = useState(true);
  const [showAreaCodeInput, setShowAreaCodeInput] = useState(false);
  const [areaCode, setAreaCode] = useState('689');

  useEffect(() => {
    fetchData();
    fetchCalls();
    const interval = setInterval(fetchCalls, 30000); // Auto-refresh calls every 30 seconds
    return () => clearInterval(interval);
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

  const fetchCalls = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/calls/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCalls(response.data.calls);
    } catch (error) {
      console.error('Failed to fetch calls:', error);
    } finally {
      setCallsLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'busy':
      case 'no-answer':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Call Logs</h2>
                <p className="text-gray-600">Recent phone calls and conversations</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={fetchCalls}
                  disabled={callsLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {callsLoading ? 'Refreshing...' : 'Refresh'}
                </button>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {clinic?.clinic_name}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Call Logs - Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Calls</h3>
                  <p className="text-sm text-gray-500">Auto-refreshes every 30 seconds</p>
            </div>

                {callsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-lg">Loading calls...</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            From
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Duration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {calls.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                              <div className="flex flex-col items-center">
                                <span className="text-4xl mb-2">📞</span>
                                <p className="text-lg font-medium">No calls yet</p>
                                <p className="text-sm">Calls will appear here once your assistant starts receiving them</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          calls.map((call) => (
                            <tr key={call.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {call.date}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                {call.from_number}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {call.duration > 0 ? formatDuration(call.duration) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(call.status)}`}>
                                  {call.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                  </div>
                </div>

            {/* Settings Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* System Status */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Assistant</span>
                      <span className={`text-lg ${assistantInfo ? 'text-green-500' : 'text-red-500'}`}>
                        {assistantInfo ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Phone</span>
                      <span className={`text-lg ${phoneInfo ? 'text-green-500' : 'text-red-500'}`}>
                        {phoneInfo ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Prompt</span>
                      <span className={`text-lg ${systemPromptPreview ? 'text-green-500' : 'text-red-500'}`}>
                        {systemPromptPreview ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-xs text-gray-500 mb-1">
                    Setup: {[assistantInfo, phoneInfo, systemPromptPreview].filter(Boolean).length}/3 Complete
                  </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{width: `${([assistantInfo, phoneInfo, systemPromptPreview].filter(Boolean).length / 3) * 100}%`}}
                    ></div>
                </div>
              </div>
            </div>
          </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    {/* Assistant */}
              {!assistantInfo ? (
                <button
                  onClick={handleCreateAssistant}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">🤖</span>
                          <div>
                            <p className="font-medium text-gray-900">Create Assistant</p>
                            <p className="text-sm text-gray-500">Set up AI to handle calls</p>
                          </div>
                        </div>
                      </button>
                    ) : (
                      <Link
                        to="/prompt"
                        className="block w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{systemPromptPreview ? '💬' : '📝'}</span>
                      <div>
                            <p className="font-medium text-gray-900">System Prompt</p>
                            <p className="text-sm text-gray-500">
                              {systemPromptPreview ? 'Configured' : 'Not configured'}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )}

                    {/* Knowledge Base */}
                    <Link
                      to="/knowledge"
                      className="block w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📚</span>
                        <div>
                          <p className="font-medium text-gray-900">Knowledge Base</p>
                          <p className="text-sm text-gray-500">Upload files</p>
                        </div>
                      </div>
                    </Link>

                    {/* Phone Number */}
                    <div className="p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center mb-3">
                        <span className="text-2xl mr-3">📞</span>
                        <div>
                          <p className="font-medium text-gray-900">Phone Number</p>
                          <p className="text-sm text-gray-500">
                            {phoneInfo ? 'Configured' : 'Not provisioned'}
                          </p>
                        </div>
                      </div>
                      
                      {phoneInfo ? (
                        <div>
                          <p className="text-sm font-mono text-gray-700 mb-3">{phoneInfo.phone_number}</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowAreaCodeInput(true)}
                        disabled={loading}
                              className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                      >
                              New
                      </button>
                      <button
                        onClick={handleDeletePhone}
                              className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                        </div>
                      ) : (
                        <div>
                          {!showAreaCodeInput ? (
                            <button
                              onClick={() => setShowAreaCodeInput(true)}
                              className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                            >
                              Get Number
                            </button>
                          ) : (
                            <div>
                          <select
                            value={areaCode}
                            onChange={(e) => setAreaCode(e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
                          >
                            <option value="689">689</option>
                            <option value="447">447</option>
                            <option value="539">539</option>
                          </select>
                              <div className="flex space-x-1">
                          <button
                            onClick={handleProvisionPhone}
                            disabled={loading}
                                  className="flex-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                          >
                                  {loading ? 'Getting...' : 'Get'}
                          </button>
                          <button
                            onClick={() => setShowAreaCodeInput(false)}
                                  className="flex-1 bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                        </div>
                )}
              </div>
            </div>
          </div>

                {/* System Info */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">System Info</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-500">Model:</span>
                      <span className="ml-2 text-gray-900">GPT-4o-mini</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Voice:</span>
                      <span className="ml-2 text-gray-900">Nova</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Clinic:</span>
                      <span className="ml-2 text-gray-900">{clinic?.clinic_name}</span>
                    </div>
                    {systemPromptPreview && (
                    <div>
                        <span className="text-gray-500">Prompt:</span>
                        <p className="text-xs text-gray-600 italic mt-1 bg-gray-50 p-2 rounded">
                          "{systemPromptPreview}..."
                        </p>
                  </div>
                )}
                  </div>
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