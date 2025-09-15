const express = require('express');
const { db } = require('../db');
const { authenticateAdmin } = require('../middleware/adminAuth');
const router = express.Router();

// Get default system prompt
router.get('/default', authenticateAdmin, async (req, res) => {
  try {
    const promptDoc = await db.collection('system_settings').doc('default_prompt').get();
    
    if (!promptDoc.exists) {
      // Return the current default from assistant.js
      const defaultPrompt = `You are a professional medical clinic assistant. Your role is to help patients with general inquiries, and basic information about the clinic.

Key guidelines:
- Be polite, professional, and empathetic
- Keep responses concise and helpful
- For medical emergencies, always direct patients to call 911 or go to the nearest emergency room
- For specific medical questions, direct patients to speak with a healthcare provider
- You can help with appointment scheduling, clinic hours, location, and general services
- If you don't know something, admit it and offer to connect them with the appropriate staff
- Always end calls politely and professionally

Remember: You are not a medical professional and cannot provide medical advice, diagnosis, or treatment recommendations.`;
      
      return res.json({ 
        prompt: defaultPrompt,
        isDefault: true
      });
    }
    
    const data = promptDoc.data();
    res.json({ 
      prompt: data.prompt,
      updated_at: data.updated_at,
      updated_by: data.updated_by,
      isDefault: false
    });
  } catch (error) {
    console.error('Error fetching default prompt:', error);
    res.status(500).json({ error: 'Failed to fetch default prompt' });
  }
});

// Update default system prompt
router.put('/default', authenticateAdmin, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const promptData = {
      prompt: prompt.trim(),
      updated_at: new Date(),
      updated_by: req.admin.email || 'admin'
    };
    
    await db.collection('system_settings').doc('default_prompt').set(promptData);
    
    res.json({ 
      message: 'Default system prompt updated successfully',
      prompt: promptData.prompt,
      updated_at: promptData.updated_at
    });
  } catch (error) {
    console.error('Error updating default prompt:', error);
    res.status(500).json({ error: 'Failed to update default prompt' });
  }
});

// Reset to original default prompt
router.post('/default/reset', authenticateAdmin, async (req, res) => {
  try {
    const originalPrompt = `You are a professional medical clinic assistant. Your role is to help patients with general inquiries, and basic information about the clinic.

Key guidelines:
- Be polite, professional, and empathetic
- Keep responses concise and helpful
- For medical emergencies, always direct patients to call 911 or go to the nearest emergency room
- For specific medical questions, direct patients to speak with a healthcare provider
- You can help with appointment scheduling, clinic hours, location, and general services
- If you don't know something, admit it and offer to connect them with the appropriate staff
- Always end calls politely and professionally

Remember: You are not a medical professional and cannot provide medical advice, diagnosis, or treatment recommendations.`;
    
    const promptData = {
      prompt: originalPrompt,
      updated_at: new Date(),
      updated_by: req.admin.email || 'admin'
    };
    
    await db.collection('system_settings').doc('default_prompt').set(promptData);
    
    res.json({ 
      message: 'Default system prompt reset to original',
      prompt: promptData.prompt,
      updated_at: promptData.updated_at
    });
  } catch (error) {
    console.error('Error resetting default prompt:', error);
    res.status(500).json({ error: 'Failed to reset default prompt' });
  }
});

// Get prompt usage statistics
router.get('/usage', authenticateAdmin, async (req, res) => {
  try {
    // Get all assistants to see which ones are using custom prompts
    const assistantsSnapshot = await db.collection('assistants').get();
    
    let customPromptCount = 0;
    let defaultPromptCount = 0;
    
    for (const doc of assistantsSnapshot.docs) {
      const assistantData = doc.data();
      // This would require checking VAPI API to see if they have custom prompts
      // For now, we'll assume all are using default
      defaultPromptCount++;
    }
    
    res.json({
      totalAssistants: assistantsSnapshot.size,
      usingDefaultPrompt: defaultPromptCount,
      usingCustomPrompt: customPromptCount
    });
  } catch (error) {
    console.error('Error fetching prompt usage:', error);
    res.status(500).json({ error: 'Failed to fetch prompt usage statistics' });
  }
});

module.exports = router;

