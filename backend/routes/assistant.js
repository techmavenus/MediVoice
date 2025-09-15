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
    model: "gpt-4o-mini",
    systemPrompt: `You are a professional medical clinic assistant. Your role is to help patients with general inquiries, and basic information about the clinic.

Key guidelines:
- Be polite, professional, and empathetic
- Keep responses concise and helpful
- For medical emergencies, always direct patients to call 911 or go to the nearest emergency room
- For specific medical questions, direct patients to speak with a healthcare provider
- You can help with appointment scheduling, clinic hours, location, and general services
- If you don't know something, admit it and offer to connect them with the appropriate staff
- Always end calls politely and professionally

Remember: You are not a medical professional and cannot provide medical advice, diagnosis, or treatment recommendations.`
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

    // Get default system prompt from database
    let systemPrompt = ASSISTANT_CONFIG.model.systemPrompt;
    try {
      const promptDoc = await db.collection('system_settings').doc('default_prompt').get();
      if (promptDoc.exists) {
        systemPrompt = promptDoc.data().prompt;
      }
    } catch (error) {
      console.log('Using fallback system prompt:', error.message);
    }

    // Create personalized assistant config
    const personalizedConfig = {
      ...ASSISTANT_CONFIG,
      name: `${clinicName} Assistant`,
      model: {
        ...ASSISTANT_CONFIG.model,
        systemPrompt: systemPrompt
      }
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