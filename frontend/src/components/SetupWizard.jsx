import React, { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import Modal from './Modal';

const SetupWizard = ({ clinic, onComplete, onLogout }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [areaCode, setAreaCode] = useState('689');
  const [provisioningStatus, setProvisioningStatus] = useState('');
  
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

  const steps = [
    {
      id: 1,
      title: 'Welcome!',
      description: 'Let\'s get your clinic assistant set up in just a few steps.',
      icon: '👋',
      content: (
        <div className="text-center">
          <div className="text-8xl mb-8">🏥</div>
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to {clinic?.clinic_name}
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            We'll help you set up your AI phone assistant in just 3 simple steps.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-left max-w-2xl mx-auto">
            <h4 className="font-semibold text-blue-900 mb-4 text-lg">What we'll set up:</h4>
            <ul className="text-blue-800 space-y-3">
              <li className="flex items-center">
                <span className="text-2xl mr-3">✅</span>
                <span>Create your AI assistant</span>
              </li>
              <li className="flex items-center">
                <span className="text-2xl mr-3">✅</span>
                <span>Provision a phone number</span>
              </li>
              <li className="flex items-center">
                <span className="text-2xl mr-3">✅</span>
                <span>Configure the system prompt</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: 'Create Assistant',
      description: 'Setting up your AI assistant...',
      icon: '🤖',
      content: (
        <div className="text-center">
          <div className="text-8xl mb-8">🤖</div>
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Creating Your AI Assistant
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            We're setting up your personalized AI assistant that will handle phone calls.
          </p>
          {loading && (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mr-4"></div>
              <span className="text-xl text-blue-600">Creating assistant...</span>
            </div>
          )}
        </div>
      )
    },
    {
      id: 3,
      title: 'Phone Number',
      description: 'Getting your phone number...',
      icon: '📞',
      content: (
        <div className="text-center">
          <div className="text-8xl mb-8">📞</div>
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Provision Phone Number
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            Choose your preferred area code for the phone number.
          </p>
          
          <div className="max-w-md mx-auto">
            <label className="block text-lg font-medium text-gray-700 mb-4">
              Area Code
            </label>
            <select
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value)}
              className="w-full px-6 py-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="689">689</option>
              <option value="447">447</option>
              <option value="539">539</option>
            </select>
          </div>

          {provisioningStatus && (
            <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-lg text-blue-700">{provisioningStatus}</span>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 4,
      title: 'System Prompt',
      description: 'Configuring your assistant...',
      icon: '💬',
      content: (
        <div className="text-center">
          <div className="text-8xl mb-8">💬</div>
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            System Prompt Ready
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            Your assistant has been configured with a professional medical clinic prompt.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-left max-w-2xl mx-auto">
            <h4 className="font-semibold text-green-900 mb-4 text-lg">Default Configuration:</h4>
            <ul className="text-green-800 space-y-3">
              <li className="flex items-center">
                <span className="text-2xl mr-3">•</span>
                <span>Professional medical assistant</span>
              </li>
              <li className="flex items-center">
                <span className="text-2xl mr-3">•</span>
                <span>Handles general inquiries</span>
              </li>
              <li className="flex items-center">
                <span className="text-2xl mr-3">•</span>
                <span>Directs emergencies to 911</span>
              </li>
              <li className="flex items-center">
                <span className="text-2xl mr-3">•</span>
                <span>Refers medical questions to providers</span>
              </li>
            </ul>
            <p className="text-sm text-green-700 mt-4">
              You can customize this later in the System Prompt section.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: 'Complete!',
      description: 'Your assistant is ready to go!',
      icon: '🎉',
      content: (
        <div className="text-center">
          <div className="text-8xl mb-8">🎉</div>
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Setup Complete!
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            Your AI assistant is now ready to handle phone calls for your clinic.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-left max-w-2xl mx-auto">
            <h4 className="font-semibold text-green-900 mb-4 text-lg">What's Next:</h4>
            <ul className="text-green-800 space-y-3">
              <li className="flex items-center">
                <span className="text-2xl mr-3">•</span>
                <span>Monitor call logs in the dashboard</span>
              </li>
              <li className="flex items-center">
                <span className="text-2xl mr-3">•</span>
                <span>Customize the system prompt as needed</span>
              </li>
              <li className="flex items-center">
                <span className="text-2xl mr-3">•</span>
                <span>Upload knowledge base files</span>
              </li>
              <li className="flex items-center">
                <span className="text-2xl mr-3">•</span>
                <span>Your assistant is ready to take calls!</span>
              </li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const handleCreateAssistant = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      await axios.post(`${API_BASE_URL}/api/assistant/create`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCurrentStep(3); // Move to phone number step
    } catch (error) {
      console.error('Failed to create assistant:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        onLogout();
        return;
      }
      setError(error.response?.data?.error || 'Failed to create assistant');
      setModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error || 'Failed to create assistant',
        type: 'error',
        onConfirm: null,
        confirmText: 'OK',
        showCancel: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProvisionPhone = async () => {
    try {
      setLoading(true);
      setError('');
      setProvisioningStatus(`Trying area code ${areaCode}...`);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`${API_BASE_URL}/api/phone/provision`, {
        areaCode: areaCode
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProvisioningStatus('');
      setCurrentStep(4); // Move to system prompt step
      
      // Show success message with fallback info if applicable
      const fallbackInfo = response.data.fallbackInfo;
      if (fallbackInfo && fallbackInfo.wasFallback) {
        setModal({
          isOpen: true,
          title: 'Phone Number Provisioned',
          message: `Phone number successfully provisioned!\n\nNote: Your requested area code (${fallbackInfo.requestedAreaCode}) was not available, so we provisioned a number with area code ${fallbackInfo.successfulAreaCode} instead.`,
          type: 'success',
          onConfirm: null,
          confirmText: 'OK',
          showCancel: false
        });
      }
    } catch (error) {
      console.error('Failed to provision phone:', error);
      setProvisioningStatus('');
      if (error.response?.status === 401 || error.response?.status === 403) {
        onLogout();
        return;
      }
      
      // Enhanced error message with attempted area codes
      let errorMessage = error.response?.data?.error || 'Failed to provision phone number';
      if (error.response?.data?.attemptedAreaCodes) {
        errorMessage += `\n\nAttempted area codes: ${error.response.data.attemptedAreaCodes.join(', ')}`;
      }
      
      setModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
        type: 'error',
        onConfirm: null,
        confirmText: 'OK',
        showCancel: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 2) {
      handleCreateAssistant();
    } else if (currentStep === 3) {
      handleProvisionPhone();
    } else if (currentStep === 4) {
      setCurrentStep(5);
    } else if (currentStep === 5) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const currentStepData = steps.find(step => step.id === currentStep);
  const isLastStep = currentStep === steps.length;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome to {clinic?.clinic_name}</h1>
              <p className="text-gray-600 mt-1">Let's set up your AI phone assistant</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Step {currentStep} of {steps.length}
              </div>
              <div className="flex space-x-2">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={`w-4 h-4 rounded-full ${
                      step.id <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-4xl">
            {currentStepData.content}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={handleNext}
              disabled={loading}
              className="px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : (isLastStep ? 'Complete Setup' : 'Continue')}
            </button>
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
    </div>
  );
};

export default SetupWizard;
