require('dotenv').config();
const { db } = require('../db');

async function checkAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    
    if (!adminEmail) {
      console.error('ADMIN_EMAIL environment variable not set');
      process.exit(1);
    }

    console.log('Checking for admin user with email:', adminEmail);
    
    // Find admin user
    const adminQuery = await db.collection('clinics').where('email', '==', adminEmail).get();
    
    if (adminQuery.empty) {
      console.log('❌ No admin user found with email:', adminEmail);
      console.log('Run: npm run create-admin');
      process.exit(1);
    }

    const adminDoc = adminQuery.docs[0];
    const adminData = adminDoc.data();
    
    console.log('✅ Admin user found!');
    console.log('Admin ID:', adminDoc.id);
    console.log('Email:', adminData.email);
    console.log('Clinic Name:', adminData.clinic_name);
    console.log('Role:', adminData.role);
    console.log('Created:', adminData.created_at);
    
    // Check if role is properly set
    if (adminData.role === 'admin') {
      console.log('✅ Role is correctly set to "admin"');
    } else {
      console.log('❌ Role is not set to "admin", current role:', adminData.role);
    }
    
  } catch (error) {
    console.error('Error checking admin user:', error);
    process.exit(1);
  }
}

checkAdmin();

