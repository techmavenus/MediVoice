const express = require('express');
const axios = require('axios');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Provision phone number with fallback area codes
router.post('/provision', authenticateToken, async (req, res) => {
  try {
    const clinicId = req.clinic.id;
    const { areaCode = '689' } = req.body;

    // Double-check if phone number already exists for this clinic
    const existingPhone = await db.collection('phone_numbers').where('clinic_id', '==', clinicId).get();
    if (!existingPhone.empty) {
      console.log(`Attempted duplicate phone provision for clinic ${clinicId}`);
      return res.status(400).json({ error: 'Phone number already provisioned for this clinic' });
    }

    // Get assistant for this clinic
    const assistantQuery = await db.collection('assistants').where('clinic_id', '==', clinicId).get();
    if (assistantQuery.empty) {
      return res.status(400).json({ error: 'No assistant found. Please create an assistant first.' });
    }

    const assistantDoc = assistantQuery.docs[0];
    const vapiAssistantId = assistantDoc.data().vapi_assistant_id;

    // Define fallback area codes in order of preference
    const fallbackAreaCodes = [areaCode, '689', '447', '539'];
    const uniqueAreaCodes = [...new Set(fallbackAreaCodes)]; // Remove duplicates

    let vapiResponse = null;
    let successfulAreaCode = null;
    let lastError = null;

    // Try each area code until one succeeds
    for (const currentAreaCode of uniqueAreaCodes) {
      try {
        console.log(`Attempting to provision phone with area code: ${currentAreaCode}`);
        
        vapiResponse = await axios.post('https://api.vapi.ai/phone-number', {
          provider: "vapi",
          numberDesiredAreaCode: currentAreaCode
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`VAPI phone creation response for area code ${currentAreaCode}:`, vapiResponse.data);

        const vapiPhoneId = vapiResponse.data.id;

        if (vapiPhoneId) {
          successfulAreaCode = currentAreaCode;
          console.log(`Successfully provisioned phone with area code: ${currentAreaCode}`);
          break;
        } else {
          console.log(`No phone ID returned for area code ${currentAreaCode}`);
          lastError = new Error(`No phone ID returned from VAPI for area code ${currentAreaCode}`);
        }
      } catch (error) {
        console.error(`Failed to provision phone with area code ${currentAreaCode}:`, error.response?.data || error.message);
        lastError = error;
        
        // If this is the last area code, we'll throw the error
        if (currentAreaCode === uniqueAreaCodes[uniqueAreaCodes.length - 1]) {
          throw error;
        }
        
        // Continue to next area code
        continue;
      }
    }

    if (!vapiResponse || !successfulAreaCode) {
      return res.status(500).json({
        error: 'Failed to provision phone number with any area code',
        debug: lastError?.response?.data || lastError?.message,
        attemptedAreaCodes: uniqueAreaCodes
      });
    }

    const vapiPhoneId = vapiResponse.data.id;

    // Extract phone number from response or use VAPI ID as identifier
    const phoneNumber = vapiResponse.data.number ||
                       vapiResponse.data.phoneNumber ||
                       vapiResponse.data.phone ||
                       `VAPI-${vapiPhoneId.substring(0, 8)}`;

    console.log(`Using phone number: ${phoneNumber} (provisioned with area code: ${successfulAreaCode})`);

    // Link the phone number to the assistant
    try {
      await axios.patch(`https://api.vapi.ai/phone-number/${vapiPhoneId}`, {
        assistantId: vapiAssistantId
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Phone number linked to assistant successfully');
    } catch (linkError) {
      console.error('Failed to link phone to assistant:', linkError.response?.data || linkError.message);
      // Continue anyway - we have the phone number
    }

    // Store phone number in database using transaction to prevent race conditions
    const phoneData = {
      clinic_id: clinicId,
      phone_number: phoneNumber,
      vapi_phone_id: vapiPhoneId,
      area_code: successfulAreaCode,
      created_at: new Date()
    };

    let phoneRef;
    await db.runTransaction(async (transaction) => {
      // Final check within transaction
      const finalCheck = await transaction.get(db.collection('phone_numbers').where('clinic_id', '==', clinicId));
      if (!finalCheck.empty) {
        throw new Error('Phone number already provisioned for this clinic');
      }

      // Create new document reference and set data
      phoneRef = db.collection('phone_numbers').doc();
      transaction.set(phoneRef, phoneData);
    });

    res.status(201).json({
      message: 'Phone number provisioned successfully',
      phone: {
        id: phoneRef.id,
        ...phoneData
      },
      fallbackInfo: {
        requestedAreaCode: areaCode,
        successfulAreaCode: successfulAreaCode,
        wasFallback: areaCode !== successfulAreaCode
      }
    });
  } catch (error) {
    console.error('Phone provisioning error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      return res.status(500).json({ error: 'VAPI API authentication failed' });
    }
    res.status(500).json({ error: 'Failed to provision phone number' });
  }
});

// Get phone number info
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const clinicId = req.clinic.id;

    const phoneQuery = await db.collection('phone_numbers').where('clinic_id', '==', clinicId).get();

    if (phoneQuery.empty) {
      return res.json({ phone: null });
    }

    const phoneDoc = phoneQuery.docs[0];
    const phone = {
      id: phoneDoc.id,
      ...phoneDoc.data()
    };

    res.json({ phone });
  } catch (error) {
    console.error('Get phone info error:', error);
    res.status(500).json({ error: 'Failed to get phone info' });
  }
});

// Delete phone number
router.delete('/delete', authenticateToken, async (req, res) => {
  try {
    const clinicId = req.clinic.id;

    // Get phone number for this clinic
    const phoneQuery = await db.collection('phone_numbers').where('clinic_id', '==', clinicId).get();
    if (phoneQuery.empty) {
      return res.status(404).json({ error: 'No phone number found for this clinic' });
    }

    const phoneDoc = phoneQuery.docs[0];
    const phoneData = phoneDoc.data();
    const vapiPhoneId = phoneData.vapi_phone_id;

    // Delete from VAPI
    try {
      await axios.delete(`https://api.vapi.ai/phone-number/${vapiPhoneId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
        }
      });
      console.log('Phone number deleted from VAPI');
    } catch (vapiError) {
      console.error('Failed to delete phone from VAPI:', vapiError.response?.data || vapiError.message);
      // Continue with database deletion even if VAPI deletion fails
    }

    // Delete from database
    await db.collection('phone_numbers').doc(phoneDoc.id).delete();

    res.json({ message: 'Phone number deleted successfully' });
  } catch (error) {
    console.error('Delete phone error:', error);
    res.status(500).json({ error: 'Failed to delete phone number' });
  }
});

module.exports = router;