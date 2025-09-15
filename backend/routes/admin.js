const express = require('express');
const { db } = require('../db');
const { authenticateAdmin } = require('../middleware/adminAuth');
const router = express.Router();

// Get all clinics
router.get('/clinics', authenticateAdmin, async (req, res) => {
  try {
    const clinicsSnapshot = await db.collection('clinics').get();
    const clinicIds = clinicsSnapshot.docs.map(doc => doc.id);
    
    // Batch fetch all related data
    const [assistantsSnapshot, phoneNumbersSnapshot] = await Promise.all([
      db.collection('assistants').where('clinic_id', 'in', clinicIds).get(),
      db.collection('phone_numbers').where('clinic_id', 'in', clinicIds).get()
    ]);
    
    // Create lookup maps for faster access
    const assistantsByClinic = {};
    assistantsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      assistantsByClinic[data.clinic_id] = data;
    });
    
    const phonesByClinic = {};
    phoneNumbersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      phonesByClinic[data.clinic_id] = data;
    });
    
    
    const clinics = [];

    for (const doc of clinicsSnapshot.docs) {
      const clinicData = doc.data();
      
      // Get data from lookup maps
      const hasAssistant = !!assistantsByClinic[doc.id];
      const phoneInfo = phonesByClinic[doc.id] ? {
        phone_number: phonesByClinic[doc.id].phone_number,
        area_code: phonesByClinic[doc.id].area_code,
        created_at: phonesByClinic[doc.id].created_at
      } : null;
      
      // Convert Firestore timestamp to JavaScript Date
      let createdDate;
      try {
        if (clinicData.created_at && clinicData.created_at.toDate) {
          // Firestore Timestamp object
          createdDate = clinicData.created_at.toDate();
        } else if (clinicData.created_at && clinicData.created_at.seconds) {
          // Firestore timestamp with seconds property
          createdDate = new Date(clinicData.created_at.seconds * 1000);
        } else if (clinicData.created_at && clinicData.created_at._seconds) {
          // Alternative Firestore timestamp format
          createdDate = new Date(clinicData.created_at._seconds * 1000);
        } else if (clinicData.created_at) {
          // Try to parse as regular date
          createdDate = new Date(clinicData.created_at);
        } else {
          createdDate = new Date();
        }
        
        // Validate the date
        if (isNaN(createdDate.getTime())) {
          createdDate = new Date();
        }
      } catch (error) {
        createdDate = new Date();
      }

      clinics.push({
        id: doc.id,
        clinic_name: clinicData.clinic_name,
        email: clinicData.email,
        created_at: createdDate.toISOString(),
        hasAssistant,
        phoneInfo
      });
    }
    
    // Sort by creation date (newest first)
    clinics.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({ clinics });
  } catch (error) {
    console.error('Error fetching clinics:', error);
    res.status(500).json({ error: 'Failed to fetch clinics' });
  }
});

// Get clinic details
router.get('/clinics/:id', authenticateAdmin, async (req, res) => {
  try {
    const clinicId = req.params.id;
    
    // Get clinic info
    const clinicDoc = await db.collection('clinics').doc(clinicId).get();
    if (!clinicDoc.exists) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    
    const clinicData = clinicDoc.data();
    
    // Get assistant info
    const assistantQuery = await db.collection('assistants').where('clinic_id', '==', clinicId).get();
    const assistant = assistantQuery.empty ? null : {
      id: assistantQuery.docs[0].id,
      ...assistantQuery.docs[0].data()
    };
    
    // Get phone info
    const phoneQuery = await db.collection('phone_numbers').where('clinic_id', '==', clinicId).get();
    const phone = phoneQuery.empty ? null : {
      id: phoneQuery.docs[0].id,
      ...phoneQuery.docs[0].data()
    };
    
    // Get recent calls
    const callsQuery = await db.collection('calls')
      .where('clinic_id', '==', clinicId)
      .orderBy('created_at', 'desc')
      .limit(10)
      .get();
    
    const calls = callsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      clinic: {
        id: clinicDoc.id,
        ...clinicData
      },
      assistant,
      phone,
      recentCalls: calls
    });
  } catch (error) {
    console.error('Error fetching clinic details:', error);
    res.status(500).json({ error: 'Failed to fetch clinic details' });
  }
});

// Delete clinic
router.delete('/clinics/:id', authenticateAdmin, async (req, res) => {
  try {
    const clinicId = req.params.id;
    
    // Get clinic info first
    const clinicDoc = await db.collection('clinics').doc(clinicId).get();
    if (!clinicDoc.exists) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    
    // Delete related data
    const batch = db.batch();
    
    // Delete assistants
    const assistantQuery = await db.collection('assistants').where('clinic_id', '==', clinicId).get();
    assistantQuery.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete phone numbers
    const phoneQuery = await db.collection('phone_numbers').where('clinic_id', '==', clinicId).get();
    phoneQuery.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete calls
    const callsQuery = await db.collection('calls').where('clinic_id', '==', clinicId).get();
    callsQuery.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete knowledge base files
    const knowledgeQuery = await db.collection('knowledge_files').where('clinic_id', '==', clinicId).get();
    knowledgeQuery.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete clinic
    batch.delete(db.collection('clinics').doc(clinicId));
    
    await batch.commit();
    
    res.json({ message: 'Clinic and all related data deleted successfully' });
  } catch (error) {
    console.error('Error deleting clinic:', error);
    res.status(500).json({ error: 'Failed to delete clinic' });
  }
});

// Get system statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    // Get total clinics
    const clinicsSnapshot = await db.collection('clinics').get();
    const totalClinics = clinicsSnapshot.size;
    
    // Get total assistants
    const assistantsSnapshot = await db.collection('assistants').get();
    const totalAssistants = assistantsSnapshot.size;
    
    // Get total phone numbers
    const phonesSnapshot = await db.collection('phone_numbers').get();
    const totalPhones = phonesSnapshot.size;
    
    // Get total calls
    const callsSnapshot = await db.collection('calls').get();
    const totalCalls = callsSnapshot.size;
    
    // Get calls from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCallsQuery = await db.collection('calls')
      .where('created_at', '>=', thirtyDaysAgo)
      .get();
    const recentCalls = recentCallsQuery.size;
    
    res.json({
      totalClinics,
      totalAssistants,
      totalPhones,
      totalCalls,
      recentCalls
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;

