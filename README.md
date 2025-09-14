# VAPI Wrapper MVP

A minimal web application that wraps VAPI (Voice API) for clinics to manage AI phone assistants.

## Features

1. **Clinic Registration & Login** - JWT-based authentication
2. **Create VAPI Assistant** - Automatically creates one assistant per clinic
3. **Configure System Prompt** - Update assistant's behavior via simple textarea
4. **Upload Knowledge Base Files** - PDF/TXT file uploads to VAPI
5. **Phone Number Provisioning** - Get one phone number per clinic
6. **Display Call Logs** - View call history with auto-refresh

## Tech Stack

- Backend: Node.js with Express
- Database: Firebase Firestore
- Frontend: React with Tailwind CSS
- Authentication: JWT tokens
- File Storage: Local filesystem + VAPI

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing project
3. Enable Firestore Database in your project
4. Go to Project Settings > Service Accounts
5. Generate a new private key and download the JSON file
6. Extract the following values from the JSON file for your `.env` file:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key_id` → `FIREBASE_PRIVATE_KEY_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `client_id` → `FIREBASE_CLIENT_ID`

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `FIREBASE_PRIVATE_KEY_ID`: Private key ID from Firebase service account
- `FIREBASE_PRIVATE_KEY`: Private key from Firebase service account
- `FIREBASE_CLIENT_EMAIL`: Client email from Firebase service account
- `FIREBASE_CLIENT_ID`: Client ID from Firebase service account
- `VAPI_API_KEY`: Your VAPI API key
- `JWT_SECRET`: Random string for JWT signing
- `PORT`: Server port (default: 3000)

### 3. Install Dependencies

Note: Firebase will automatically create collections when you first add data, so no manual database setup is required.

```bash
# Backend dependencies
npm install

# Frontend dependencies
cd frontend && npm install
```

### 4. Start the Application

```bash
# Start backend (from root directory)
npm run dev

# Start frontend (in another terminal)
npm run frontend
```

The backend runs on http://localhost:3000
The frontend runs on http://localhost:3001

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register clinic
- `POST /api/auth/login` - Login clinic

### Assistant
- `POST /api/assistant/create` - Create VAPI assistant
- `PUT /api/assistant/prompt` - Update system prompt
- `GET /api/assistant/info` - Get assistant info

### Knowledge Base
- `POST /api/knowledge/upload` - Upload file
- `GET /api/knowledge/files` - List files
- `DELETE /api/knowledge/files/:id` - Delete file

### Phone Numbers
- `POST /api/phone/provision` - Provision phone number
- `GET /api/phone/info` - Get phone info

### Call Logs
- `GET /api/calls/logs` - Get call logs

## Frontend Routes

- `/` - Login page
- `/dashboard` - Main dashboard
- `/prompt` - System prompt configuration
- `/knowledge` - File upload
- `/calls` - Call logs

## Firestore Collections

The application uses 4 Firestore collections:
- `clinics` - Clinic accounts with authentication data
- `assistants` - VAPI assistant mappings linked to clinics
- `knowledge_files` - Uploaded files tracking with VAPI file IDs
- `phone_numbers` - Provisioned phone numbers linked to clinics

Collections are automatically created when first used - no manual setup required.

## VAPI Integration

The app integrates with these VAPI endpoints:
- Create Assistant: `POST https://api.vapi.ai/assistant`
- Update Assistant: `PATCH https://api.vapi.ai/assistant/:id`
- Upload Knowledge: `POST https://api.vapi.ai/knowledge-base`
- Get Phone Number: `POST https://api.vapi.ai/phone-number`
- Get Call Logs: `GET https://api.vapi.ai/call`

## Limitations (MVP Scope)

- One assistant per clinic
- One phone number per clinic
- No advanced filtering or analytics
- No email verification
- No password reset
- Basic error handling only
- Local file storage for uploads

## Benefits of Firebase

- **No Database Server**: No need to install or manage PostgreSQL
- **Auto-scaling**: Firestore scales automatically with usage
- **Built-in Security**: Firestore rules provide security by default
- **Real-time**: Ready for real-time features if needed in future
- **Easy Deployment**: Simplified deployment without database dependencies