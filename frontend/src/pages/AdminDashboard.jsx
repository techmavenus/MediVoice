import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import Modal from '../components/Modal';

const AdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('clinics');
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);
  
  // Modal states
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    confirmText: 'OK',
    showCancel: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [clinicsResponse, promptResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/clinics`, { headers }),
        axios.get(`${API_BASE_URL}/api/system-prompt/default`, { headers })
      ]);

      setClinics(clinicsResponse.data.clinics);
      setSystemPrompt(promptResponse.data.prompt);
      
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        onLogout();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClinic = (clinicId, clinicName) => {
    setModal({
      isOpen: true,
      title: 'Delete Clinic',
      message: `Are you sure you want to delete "${clinicName}"? This will permanently delete all associated data including assistants, phone numbers, and call logs.`,
      type: 'confirm',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API_BASE_URL}/api/admin/clinics/${clinicId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setClinics(clinics.filter(c => c.id !== clinicId));
          setModal({
            isOpen: true,
            title: 'Success',
            message: 'Clinic deleted successfully',
            type: 'success',
            onConfirm: null,
            confirmText: 'OK',
            showCancel: false
          });
        } catch (error) {
          setModal({
            isOpen: true,
            title: 'Error',
            message: 'Failed to delete clinic',
            type: 'error',
            onConfirm: null,
            confirmText: 'OK',
            showCancel: false
          });
        }
      },
      confirmText: 'Delete',
      showCancel: true
    });
  };

  const handleUpdatePrompt = async () => {
    try {
      setPromptLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.put(`${API_BASE_URL}/api/system-prompt/default`, {
        prompt: systemPrompt
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setModal({
        isOpen: true,
        title: 'Success',
        message: 'Default system prompt updated successfully',
        type: 'success',
        onConfirm: null,
        confirmText: 'OK',
        showCancel: false
      });
    } catch (error) {
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to update system prompt',
        type: 'error',
        onConfirm: null,
        confirmText: 'OK',
        showCancel: false
      });
    } finally {
      setPromptLoading(false);
    }
  };

  const handleResetPrompt = () => {
    setModal({
      isOpen: true,
      title: 'Reset System Prompt',
      message: 'Are you sure you want to reset the system prompt to the original default?',
      type: 'confirm',
      onConfirm: async () => {
        try {
          setPromptLoading(true);
          const token = localStorage.getItem('token');
          
          const response = await axios.post(`${API_BASE_URL}/api/system-prompt/default/reset`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });

          setSystemPrompt(response.data.prompt);
          setModal({
            isOpen: true,
            title: 'Success',
            message: 'System prompt reset to original default',
            type: 'success',
            onConfirm: null,
            confirmText: 'OK',
            showCancel: false
          });
        } catch (error) {
          setModal({
            isOpen: true,
            title: 'Error',
            message: 'Failed to reset system prompt',
            type: 'error',
            onConfirm: null,
            confirmText: 'OK',
            showCancel: false
          });
        } finally {
          setPromptLoading(false);
        }
      },
      confirmText: 'Reset',
      showCancel: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Admin Panel
              </h1>
            </div>
            <div className="flex items-center space-x-4">
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
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('clinics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'clinics'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Clinics ({clinics.length})
              </button>
              <button
                onClick={() => setActiveTab('system-prompt')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'system-prompt'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                System Prompt
              </button>
            </nav>
          </div>


          {/* Clinics Tab */}
          {activeTab === 'clinics' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  All Clinics
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Manage all registered clinics and their data
                </p>
              </div>
              <ul className="divide-y divide-gray-200">
                {clinics.map((clinic) => (
                  <li key={clinic.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="text-2xl">🏥</div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {clinic.clinic_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {clinic.email}
                            </div>
                            <div className="text-xs text-gray-400">
                Created: {(() => {
                  if (!clinic.created_at) return 'Unknown';
                  
                  try {
                    const date = new Date(clinic.created_at);
                    return isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
                  } catch (error) {
                    return 'Unknown';
                  }
                })()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                clinic.hasAssistant ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {clinic.hasAssistant ? '✅ Assistant' : '❌ No Assistant'}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                clinic.phoneInfo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {clinic.phoneInfo ? '✅ Phone' : '❌ No Phone'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteClinic(clinic.id, clinic.clinic_name)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* System Prompt Tab */}
          {activeTab === 'system-prompt' && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Default System Prompt
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  This prompt will be used for all new assistants created by clinics.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-700">
                      System Prompt
                    </label>
                    <textarea
                      id="system-prompt"
                      rows={15}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="Enter the default system prompt..."
                    />
                  </div>
                  
                  <div className="flex justify-between">
                    <button
                      onClick={handleResetPrompt}
                      disabled={promptLoading}
                      className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 disabled:opacity-50"
                    >
                      Reset to Original
                    </button>
                    <button
                      onClick={handleUpdatePrompt}
                      disabled={promptLoading}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {promptLoading ? 'Updating...' : 'Update Prompt'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
        showCancel={modal.showCancel}
      />
    </div>
  );
};

export default AdminDashboard;
