const express = require('express');
const axios = require('axios');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Predefined assistant configuration
const ASSISTANT_CONFIG = {
  name: "Clinic Assistant",
  model: {
    provider: "openai",
    model: "gpt-4o-mini"
  },
  voice: {
    provider: "openai",
    voiceId: "nova"
  },
  firstMessage: "Hello, thank you for calling. How can I help you today?",
  endCallFunctionEnabled: true,
  responseDelaySeconds: 0.5
};

// Create VAPI assistant
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const clinicId = req.clinic.id;

    // Check if assistant already exists for this clinic
    const existingAssistant = await db.collection('assistants').where('clinic_id', '==', clinicId).get();
    if (!existingAssistant.empty) {
      return res.status(400).json({ error: 'Assistant already exists for this clinic' });
    }

    // Get clinic info for assistant name
    const clinicDoc = await db.collection('clinics').doc(clinicId).get();
    const clinicData = clinicDoc.data();
    const clinicName = clinicData?.clinic_name || 'Clinic';

    // Create personalized assistant config
    const personalizedConfig = {
      ...ASSISTANT_CONFIG,
      name: `${clinicName} Assistant`
    };

    // Create assistant via VAPI API
    const vapiResponse = await axios.post('https://api.vapi.ai/assistant', personalizedConfig, {
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const vapiAssistantId = vapiResponse.data.id;

    // Store assistant in database
    const assistantData = {
      clinic_id: clinicId,
      vapi_assistant_id: vapiAssistantId,
      created_at: new Date()
    };

    const assistantRef = await db.collection('assistants').add(assistantData);

    res.status(201).json({
      message: 'Assistant created successfully',
      assistant: {
        id: assistantRef.id,
        ...assistantData
      }
    });
  } catch (error) {
    console.error('Assistant creation error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      return res.status(500).json({ error: 'VAPI API authentication failed' });
    }
    res.status(500).json({ error: 'Failed to create assistant' });
  }
});

// Update assistant system prompt
router.put('/prompt', authenticateToken, async (req, res) => {
  try {
    const { prompt } = req.body;
    const clinicId = req.clinic.id;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get assistant for this clinic
    const assistantQuery = await db.collection('assistants').where('clinic_id', '==', clinicId).get();
    if (assistantQuery.empty) {
      return res.status(404).json({ error: 'No assistant found for this clinic' });
    }

    const assistantDoc = assistantQuery.docs[0];
    const vapiAssistantId = assistantDoc.data().vapi_assistant_id;

    // Update assistant via VAPI API
    await axios.patch(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        systemPrompt: prompt
      }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ message: 'System prompt updated successfully' });
  } catch (error) {
    console.error('Prompt update error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      return res.status(500).json({ error: 'VAPI API authentication failed' });
    }
    res.status(500).json({ error: 'Failed to update system prompt' });
  }
});

// Get assistant info
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const clinicId = req.clinic.id;

    const assistantQuery = await db.collection('assistants').where('clinic_id', '==', clinicId).get();

    if (assistantQuery.empty) {
      return res.json({ assistant: null });
    }

    const assistantDoc = assistantQuery.docs[0];
    const assistant = {
      id: assistantDoc.id,
      ...assistantDoc.data()
    };

    res.json({ assistant });
  } catch (error) {
    console.error('Get assistant error:', error);
    res.status(500).json({ error: 'Failed to get assistant info' });
  }
});

// Get current system prompt
router.get('/prompt', authenticateToken, async (req, res) => {
  try {
    const clinicId = req.clinic.id;

    // Get assistant for this clinic
    const assistantQuery = await db.collection('assistants').where('clinic_id', '==', clinicId).get();
    if (assistantQuery.empty) {
      return res.status(404).json({ error: 'No assistant found for this clinic' });
    }

    const assistantDoc = assistantQuery.docs[0];
    const vapiAssistantId = assistantDoc.data().vapi_assistant_id;

    // Get assistant from VAPI API
    const vapiResponse = await axios.get(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const systemPrompt = vapiResponse.data.model?.systemPrompt || '';

    res.json({ prompt: systemPrompt });
  } catch (error) {
    console.error('Get prompt error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      return res.status(500).json({ error: 'VAPI API authentication failed' });
    }
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Assistant not found' });
    }
    res.status(500).json({ error: 'Failed to get system prompt' });
  }
});

module.exports = router;