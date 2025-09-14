const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const router = express.Router();

// Register clinic
router.post('/register', async (req, res) => {
  try {
    const { email, password, clinic_name } = req.body;

    // Validation
    if (!email || !password || !clinic_name) {
      return res.status(400).json({ error: 'Email, password, and clinic name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if clinic already exists
    const existingClinic = await db.collection('clinics').where('email', '==', email).get();
    if (!existingClinic.empty) {
      return res.status(400).json({ error: 'Clinic with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create clinic
    const clinicData = {
      email,
      password_hash,
      clinic_name,
      created_at: new Date()
    };

    const clinicRef = await db.collection('clinics').add(clinicData);
    const clinic = {
      id: clinicRef.id,
      email,
      clinic_name
    };

    // Generate JWT token
    const token = jwt.sign(
      { id: clinic.id, email: clinic.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Clinic registered successfully',
      token,
      clinic: {
        id: clinic.id,
        email: clinic.email,
        clinic_name: clinic.clinic_name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login clinic
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find clinic
    const clinicQuery = await db.collection('clinics').where('email', '==', email).get();
    if (clinicQuery.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const clinicDoc = clinicQuery.docs[0];
    const clinic = {
      id: clinicDoc.id,
      ...clinicDoc.data()
    };

    // Verify password
    const validPassword = await bcrypt.compare(password, clinic.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: clinic.id, email: clinic.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      clinic: {
        id: clinic.id,
        email: clinic.email,
        clinic_name: clinic.clinic_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;