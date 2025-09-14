const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed'), false);
    }
  }
});

// Upload knowledge base file
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const clinicId = req.clinic.id;

    // Get clinic info for filename
    const clinicDoc = await db.collection('clinics').doc(clinicId).get();
    const clinicData = clinicDoc.data();
    const clinicName = clinicData?.clinic_name || 'Clinic';

    // Get assistant for this clinic
    const assistantQuery = await db.collection('assistants').where('clinic_id', '==', clinicId).get();
    if (assistantQuery.empty) {
      return res.status(400).json({ error: 'No assistant found. Please create an assistant first.' });
    }

    const assistantDoc = assistantQuery.docs[0];
    const vapiAssistantId = assistantDoc.data().vapi_assistant_id;

    // Create clinic-specific filename
    const fileExtension = req.file.originalname.split('.').pop();
    const clinicFileName = `${clinicName}-${req.file.originalname}`;

    // Create form data for VAPI upload with custom filename
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), {
      filename: clinicFileName
    });

    // Upload to VAPI file storage
    const vapiResponse = await axios.post('https://api.vapi.ai/file', formData, {
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        ...formData.getHeaders()
      }
    });

    const vapiFileId = vapiResponse.data.id;

    console.log('File uploaded to VAPI:', { vapiFileId, filename: clinicFileName });

    // Get existing assistant configuration to preserve current settings
    let existingFileIds = [];
    try {
      const assistantResponse = await axios.get(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
        }
      });

      // Extract existing file IDs from model.knowledgeBase.fileIds
      existingFileIds = assistantResponse.data.model?.knowledgeBase?.fileIds || [];
      console.log('Existing file IDs:', existingFileIds);
    } catch (getError) {
      console.error('Failed to get current assistant:', getError.response?.data || getError.message);
    }

    // Attach file to assistant using correct VAPI format
    try {
      const allFileIds = [...existingFileIds, vapiFileId];

      console.log('Attaching file to assistant with correct format...');
      await axios.patch(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          knowledgeBase: {
            fileIds: allFileIds,
            provider: "google"
          }
        }
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('File attached to assistant successfully. Total files:', allFileIds.length);
    } catch (attachError) {
      console.error('Failed to attach file to assistant:', attachError.response?.data || attachError.message);
      console.log('File uploaded but not attached to assistant');
    }

    // Store file info in database
    const fileData = {
      clinic_id: clinicId,
      filename: clinicFileName,
      original_filename: req.file.originalname,
      vapi_file_id: vapiFileId,
      uploaded_at: new Date()
    };

    const fileRef = await db.collection('knowledge_files').add(fileData);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: fileRef.id,
        ...fileData
      }
    });
  } catch (error) {
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('File upload error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      return res.status(500).json({ error: 'VAPI API authentication failed' });
    }
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get uploaded files
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const clinicId = req.clinic.id;

    const filesQuery = await db.collection('knowledge_files')
      .where('clinic_id', '==', clinicId)
      .get();

    const files = filesQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => {
      // Sort by uploaded_at descending (newest first)
      return new Date(b.uploaded_at) - new Date(a.uploaded_at);
    });

    res.json({ files });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// Delete knowledge base file
router.delete('/files/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const clinicId = req.clinic.id;

    // Get file info
    const fileDoc = await db.collection('knowledge_files').doc(fileId).get();

    if (!fileDoc.exists || fileDoc.data().clinic_id !== clinicId) {
      return res.status(404).json({ error: 'File not found' });
    }

    const vapiFileId = fileDoc.data().vapi_file_id;

    // Remove file from assistant's knowledge base
    const assistantQuery = await db.collection('assistants').where('clinic_id', '==', clinicId).get();
    if (!assistantQuery.empty) {
      const assistantDoc = assistantQuery.docs[0];
      const vapiAssistantId = assistantDoc.data().vapi_assistant_id;

      try {
        // Get current assistant configuration
        const assistantResponse = await axios.get(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
          }
        });

        // Get current file IDs and remove the deleted one
        const currentFileIds = assistantResponse.data.model?.knowledgeBase?.fileIds || [];
        const updatedFileIds = currentFileIds.filter(id => id !== vapiFileId);

        // Update assistant with remaining files
        await axios.patch(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            knowledgeBase: {
              fileIds: updatedFileIds,
              provider: "google"
            }
          }
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('File removed from assistant knowledge base');
      } catch (removeError) {
        console.error('Failed to remove file from assistant:', removeError.response?.data || removeError.message);
      }
    }

    // Delete from VAPI file storage
    await axios.delete(`https://api.vapi.ai/file/${vapiFileId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
      }
    });

    // Delete from database
    await db.collection('knowledge_files').doc(fileId).delete();

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      return res.status(500).json({ error: 'VAPI API authentication failed' });
    }
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;