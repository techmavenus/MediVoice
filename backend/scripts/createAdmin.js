require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('../db');

async function createAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      console.error('Please set ADMIN_EMAIL and ADMIN_PASSWORD environment variables');
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await db.collection('clinics').where('email', '==', adminEmail).get();
    if (!existingAdmin.empty) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(adminPassword, saltRounds);

    // Create admin clinic
    const adminData = {
      email: adminEmail,
      password_hash,
      clinic_name: 'System Administrator',
      role: 'admin',
      created_at: new Date()
    };

    const adminRef = await db.collection('clinics').add(adminData);
    console.log('Admin user created successfully!');
    console.log('Admin ID:', adminRef.id);
    console.log('Admin Email:', adminEmail);
    console.log('You can now login to the admin panel at /admin');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();

