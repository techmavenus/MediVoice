import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const SystemPrompt = ({ clinic, onLogout }) => {
  const [prompt, setPrompt] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchCurrentPrompt();
  }, []);

  const fetchCurrentPrompt = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/assistant/prompt', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrompt(response.data.prompt);
    } catch (error) {
      console.error('Failed to fetch current prompt:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        onLogout();
        return;
      }
      // If assistant doesn't exist or no prompt set, just start with empty
      setPrompt('');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:3000/api/assistant/prompt',
        { prompt },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage('System prompt updated successfully!');
      setMessageType('success');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update system prompt');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="text-xl font-semibold text-gray-900 hover:text-gray-700">
                 Clinic Assistant
              </Link>
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

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="text-indigo-600 hover:text-indigo-500 text-sm"
            >
              ← Back to Dashboard
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Configure System Prompt
            </h2>

            {initialLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-lg text-gray-600">Loading current prompt...</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                  System Prompt
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={12}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your assistant's system prompt here..."
                />
                <div className="mt-2 text-sm text-gray-600">
                  Characters: {prompt.length}
                </div>
              </div>

              {message && (
                <div className={`mb-4 p-4 rounded-md ${
                  messageType === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Prompt'}
              </button>
            </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemPrompt;