const express = require('express');
const axios = require('axios');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get call logs
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const clinicId = req.clinic.id;

    // Get assistant for this clinic
    const assistantQuery = await db.collection('assistants').where('clinic_id', '==', clinicId).get();
    if (assistantQuery.empty) {
      return res.json({ calls: [] });
    }

    const assistantDoc = assistantQuery.docs[0];
    const vapiAssistantId = assistantDoc.data().vapi_assistant_id;

    // Fetch call logs from VAPI
    const vapiResponse = await axios.get('https://api.vapi.ai/call', {
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
      },
      params: {
        assistantId: vapiAssistantId
      }
    });

    // Format call data
    const calls = vapiResponse.data.map(call => ({
      id: call.id,
      date: new Date(call.createdAt).toLocaleString(),
      from_number: call.customer?.number || 'Unknown',
      duration: call.endedAt ?
        Math.round((new Date(call.endedAt) - new Date(call.startedAt)) / 1000) : 0,
      status: call.status || 'unknown'
    }));

    res.json({ calls });
  } catch (error) {
    console.error('Get call logs error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      return res.status(500).json({ error: 'VAPI API authentication failed' });
    }
    res.status(500).json({ error: 'Failed to get call logs' });
  }
});

module.exports = router;