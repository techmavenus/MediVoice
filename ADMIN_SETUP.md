# Admin Panel Setup

This document explains how to set up and use the admin panel for managing clinics and system settings.

## Environment Variables

Add these environment variables to your `.env` file:

```bash
# Admin Panel Configuration
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_secure_admin_password
```

## Creating Admin User

1. Set the environment variables above
2. Run the admin creation script:

```bash
cd backend
npm run create-admin
```

This will create an admin user in the database that can access the admin panel.

## Admin Panel Features

### Overview Dashboard
- View system statistics (total clinics, assistants, phone numbers, calls)
- Quick overview of system health

### Clinic Management
- View all registered clinics
- See clinic status (assistant, phone number, call count)
- Delete clinics and all associated data
- View detailed clinic information

### System Prompt Management
- Edit the default system prompt used for new assistants
- Reset to original default prompt
- All new assistants will use the updated default prompt

## Accessing the Admin Panel

1. Navigate to `/admin` in your browser
2. Login with the admin credentials you created
3. You'll be redirected to the admin dashboard

## Security Notes

- Admin access is determined by the `ADMIN_EMAIL` environment variable
- Only users with this email address can access admin functions
- Admin users have full access to delete clinics and modify system settings
- All admin actions are logged in the console

## API Endpoints

### Admin Routes
- `GET /api/admin/clinics` - Get all clinics
- `GET /api/admin/clinics/:id` - Get clinic details
- `DELETE /api/admin/clinics/:id` - Delete clinic
- `GET /api/admin/stats` - Get system statistics

### System Prompt Routes
- `GET /api/system-prompt/default` - Get default system prompt
- `PUT /api/system-prompt/default` - Update default system prompt
- `POST /api/system-prompt/default/reset` - Reset to original prompt

## Database Collections

The admin panel uses these Firestore collections:
- `clinics` - All clinic registrations
- `assistants` - AI assistant configurations
- `phone_numbers` - Phone number assignments
- `calls` - Call logs
- `knowledge_files` - Uploaded knowledge base files
- `system_settings` - System-wide settings (default prompt)

## Troubleshooting

### Admin Login Issues
- Ensure `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set correctly
- Run `npm run create-admin` to create the admin user
- Check that the admin user exists in the `clinics` collection

### Permission Errors
- Verify the JWT token includes the `role: 'admin'` field
- Check that the middleware is properly configured
- Ensure the admin email matches exactly (case-sensitive)

### Data Not Loading
- Check Firestore security rules allow admin access
- Verify API endpoints are properly registered
- Check browser console for CORS or authentication errors

