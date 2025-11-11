# Voice-First AI Assistant System

A comprehensive voice-first AI assistant system with intelligent chat fallback and supervisor escalation. The system uses LiveKit for real-time voice communication with Web Speech API integration, automatically escalating to human supervisors when the AI confidence is low.

## About This Project

This is a full-stack Next.js application that provides a modern, voice-first customer service experience. The system intelligently handles customer inquiries through natural voice conversations. When the AI cannot confidently answer a question (confidence < 60%), it seamlessly transitions to text chat or escalates to a human supervisor.

**Key Highlights:**

- Voice-First Design: Natural conversation with start/stop recording control
- Smart AI Agent: Knowledge base-powered with confidence scoring
- Seamless Fallback: Automatic transition from voice to chat to supervisor
- Timeout Management: Auto-escalates unresolved issues after 2 minutes
- Real-Time Dashboard: Supervisor interface with live WebSocket updates
- Learning System: Builds knowledge base from approved supervisor responses

## System Overview

### Key Features

- **Voice-First Interface**: Real-time voice calls using LiveKit and Web Speech API
- **Manual Recording Control**: Start/Stop speaking buttons for user-controlled voice input
- **Intelligent Chat Fallback**: Automatic transition to chat when voice confidence < 60%
- **Smart Escalation**: AI escalates to supervisors when confidence < 60%
- **Auto-Timeout System**: Escalations automatically marked as unresolved after 2 minutes without supervisor response
- **Supervisor Dashboard**: Real-time management of escalated conversations with WebSocket notifications
- **Knowledge Base**: Dynamic Q&A system for business inquiries
- **Conversation Tracking**: Complete message history with confidence scores and escalation status

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL) with Prisma ORM v6.19.0
- **Voice/Video**: LiveKit Cloud with Web Speech API (SpeechRecognition & SpeechSynthesis)
- **Real-time Updates**: Socket.IO for WebSocket notifications
- **AI Service**: Custom AI service with knowledge base integration
- **Styling**: Tailwind CSS with shadcn/ui components
- **Package Manager**: pnpm

## Database Schema

### Core Models

- **User**: Customer, supervisor, and agent accounts
- **Conversation**: Chat sessions with status tracking (open, escalated, resolved, closed)
- **Message**: Individual messages with role, content, and confidence scores
- **Escalation**: Tracks escalated conversations and supervisor responses
- **KnowledgeBase**: Q&A pairs learned from conversations
- **HelpRequest/HelpRequestHistory/SupervisorResponse**: Legacy help request tracking

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database (via Supabase)
- LiveAgentKit API credentials

### 2. Environment Variables

Create a `.env` file in the root directory:

\`\`\`env

# LiveKit Configuration (Voice Communication)

LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# Database Configuration

DATABASE_URL=postgres://user:password@host:6543/postgres

# Supabase Configuration

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

**Environment Variable Details:**

- **LIVEKIT_API_KEY & LIVEKIT_API_SECRET**: Get from [LiveKit Cloud Dashboard](https://cloud.livekit.io)
- **LIVEKIT_URL**: Your LiveKit WebSocket URL (format: `wss://project-name.livekit.cloud`)
- **DATABASE_URL**: Pooled connection URL for Prisma (port 6543 for Supabase with PgBouncer)
- **DATABASE_URL_NON_POOLING**: Direct connection URL (port 5432) for migrations and direct queries
- **NEXT_PUBLIC_SUPABASE_URL**: Your Supabase project URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Supabase anonymous public key

### 3. Database Setup

#### Option A: Using Vercel Integration

1. Connect your Supabase project from the Vercel dashboard
2. Environment variables will be automatically populated

#### Option B: Manual Setup

1. Create a new PostgreSQL database in Supabase
2. Add the connection URLs to your environment variables

#### Run Migrations

\`\`\`bash
npm install
npx prisma migrate deploy
\`\`\`

### 4. Local Development

\`\`\`bash

# Install dependencies

npm install

# Run development server (Prisma generate runs automatically)

npm run dev
\`\`\`

**Note:** Prisma Client is automatically generated when running `npm run dev` or `npm start`, so you don't need to run `npx prisma generate` manually.

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

\`\`\`
├── app/
│ ├── api/
│ │ ├── chat/ # Chat message endpoints
│ │ ├── escalations/ # Escalation management
│ │ ├── livekit/ # LiveKit room management
│ │ ├── knowledge-base/ # Knowledge base CRUD
│ │ ├── ai-responses/ # AI response history
│ │ └── help-requests/ # Help request endpoints
│ ├── chat/ # Text chat interface
│ ├── knowledge-base/ # Knowledge base browser
│ ├── supervisor/
│ │ └── escalations/ # Supervisor dashboard
│ └── page.tsx # Homepage (voice interface)
├── components/
│ ├── voice-call-interface.tsx # Voice call with LiveKit + Web Speech API
│ ├── live-chat.tsx # Text chat component
│ ├── navbar.tsx # Navigation bar
│ ├── knowledge-base/
│ │ ├── kb-form.tsx # Knowledge base form
│ │ └── kb-list.tsx # Knowledge base list
│ ├── supervisor/
│ │ ├── request-detail.tsx # Escalation detail view
│ │ └── requests-list.tsx # Escalation list view
│ └── ui/ # shadcn/ui components
├── hooks/
│ ├── use-websocket.ts # Socket.IO client hook
│ └── use-toast.ts # Toast notifications
├── lib/
│ ├── prisma.ts # Prisma client singleton
│ ├── ai-service.ts # AI logic & knowledge base search
│ ├── timeout-service.ts # Escalation timeout management
│ ├── types.ts # TypeScript types
│ └── supabase/ # Supabase client utilities
├── prisma/
│ └── schema.prisma # Database schema (14 models)
├── public/ # Static assets
├── scripts/
│ └── 001_create_help_system_tables.sql # Database migration scripts
└── server.js # Socket.IO server for real-time notifications
\`\`\`

## Key Routes

### Customer Routes

- `/` - Homepage with voice call interface
- `/chat` - Text chat interface (fallback from voice)
- `/knowledge-base` - Browse knowledge base articles and information

### Supervisor Routes

- `/supervisor/escalations` - Real-time dashboard for escalated conversations with WebSocket updates

### API Routes

- `POST /api/livekit` - LiveKit room management (start-call, end-call, get-token)
- `POST /api/chat` - Send message to AI agent
- `GET /api/chat/[id]` - Get conversation history
- `GET /api/escalations` - Get all escalations (including timed out)
- `POST /api/escalations/[id]/resolve` - Supervisor responds to escalation
- `GET /api/knowledge-base` - Get knowledge base articles
- `POST /api/knowledge-base` - Add new knowledge base article
- `GET /api/ai-responses` - Get AI response history
- `GET /api/help-requests` - Get help request history

## How It Works

### Voice-First Flow

1. **Voice Call Initiated**

   - Customer clicks "Call" button on homepage
   - System creates LiveKit room and generates conversation ID
   - Customer connects via WebSocket to LiveKit

2. **Voice Interaction**

   - Customer clicks "Start Speaking" button
   - Web Speech API captures voice input continuously
   - Customer clicks "Stop Speaking" when finished
   - Speech converted to text and sent to AI

3. **AI Processing**

   - AI searches knowledge base for relevant answers
   - Generates response with confidence score
   - Response spoken back to customer via Text-to-Speech

4. **Low Confidence Handling**
   - If confidence < 60%: Automatically switch to chat interface
   - Customer can continue conversation via text
   - Full conversation history preserved

### Chat Escalation Flow

1. **Escalation Trigger**

   - AI confidence < 60% or cannot find answer
   - Conversation escalated to supervisor
   - Customer notified: "Connecting you with a specialist..."

2. **Automatic Timeout**

   - 2-minute timer starts when escalation created
   - If no supervisor response within 2 minutes:
     - Escalation marked as `resolved: false, timedOut: true`
     - System message added to conversation
     - WebSocket notification sent to supervisor dashboard

3. **Supervisor Response**

   - Supervisor sees escalation in real-time dashboard
   - Reviews full conversation history
   - Sends response directly to customer
   - Response delivered to chat interface

4. **Knowledge Base Learning**
   - Approved supervisor responses can be added to knowledge base
   - Future similar questions answered automatically by AI

### Message Roles

- `user` - Customer message (voice or text)
- `agent` - AI agent response
- `supervisor` - Human supervisor response (escalated conversations only)
- `system` - System notifications (timeout, escalation status)

## Configuration

### Adjusting Confidence Thresholds

Edit thresholds in `app/api/chat/route.ts`:

\`\`\`typescript
const VOICE_CONFIDENCE_THRESHOLD = 0.6; // 60% - triggers chat fallback
const ESCALATION_THRESHOLD = 0.6; // 60% - triggers supervisor escalation
\`\`\`

### Adjusting Timeout Settings

Edit timeout configuration in `lib/timeout-service.ts`:

\`\`\`typescript
const DEFAULT_TIMEOUT_CONFIG = {
escalationTimeoutMinutes: 2, // Escalation timeout (currently 2 minutes)
helpRequestTimeoutMinutes: 30, // Help request timeout
};
\`\`\`

### Customizing Voice Settings

Edit Web Speech API settings in `components/voice-call-interface.tsx`:

\`\`\`typescript
recognition.continuous = true; // Keep recording until stopped
recognition.interimResults = true; // Show real-time transcription
recognition.lang = "en-US"; // Language setting

utterance.rate = 0.9; // Speech speed (0.1-10)
utterance.pitch = 1.0; // Voice pitch (0-2)
utterance.volume = 1.0; // Volume (0-1)
\`\`\`

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Vercel will automatically run migrations
5. Deploy!

\`\`\`bash
vercel deploy
\`\`\`

## Troubleshooting

### Database Connection Failed

**Error**: `Can't reach database server at aws-1-us-east-1.pooler.supabase.com:6543`

**Cause**: Supabase free tier auto-pauses database after inactivity

**Fix**:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click "Resume" to wake up database
4. Or upgrade to paid plan to prevent auto-pause

### Prisma Client Issues

**Error**: `Property 'timedOut' does not exist on type...`

**Fix**: Regenerate Prisma client after schema changes
\`\`\`bash
npx prisma generate
\`\`\`

### Voice Recognition Not Working

**Cause**: Browser doesn't support Web Speech API or microphone permission denied

**Fix**:

- Use Chrome or Edge browser (best support)
- Allow microphone access when prompted
- Check browser console for specific errors

### LiveKit Connection Failed

**Error**: `Failed to connect to salon. Please try again.`

**Fix**:

- Verify `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `LIVEKIT_URL` in `.env`
- Check [LiveKit Cloud Dashboard](https://cloud.livekit.io) for API credentials
- Ensure LiveKit URL format: `wss://project-name.livekit.cloud`

### Escalation Timeout Not Working

**Cause**: Timeout service not initialized or pending timeouts not restored

**Fix**:

- Check `lib/timeout-service.ts` is imported in your API routes
- Restart dev server to restore pending timeouts
- Verify timeout configuration in `DEFAULT_TIMEOUT_CONFIG`

### Socket.IO Notifications Not Working

**Cause**: WebSocket server not running or port conflict

**Fix**:

- Ensure `server.js` is running (started with `npm run dev`)
- Check no other service is using port 3001
- Verify Socket.IO connection in browser console

## Development

### Add a New Message Field

1. Update Prisma schema in `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add_field_name`
3. Update TypeScript types in `lib/types.ts`
4. Update API endpoints to handle new field

### Customize UI

- Chat component: `components/live-chat.tsx`
- Supervisor dashboard: `app/supervisor/escalations/page.tsx`
- Styling uses Tailwind CSS via `app/globals.css`

## Architecture Highlights

### Voice System

- **LiveKit**: WebRTC-based voice rooms for low-latency audio
- **Web Speech API**: Browser-native speech recognition and synthesis
- **Manual Control**: User-controlled start/stop recording (no timeout limits)
- **Fallback Strategy**: Automatic transition to text chat on low confidence

### AI Service

- **Knowledge Base Search**: Fuzzy matching on questions and answers
- **Confidence Scoring**: Based on match quality and content relevance
- **Context Awareness**: Full conversation history included in AI prompts
- **Dynamic Learning**: Supervisor responses can be added to knowledge base

### Real-Time Features

- **Socket.IO**: WebSocket notifications for supervisor dashboard
- **Room-Based Events**: Supervisors join specific rooms for relevant updates
- **Live Updates**: New escalations and resolutions broadcast in real-time

### Timeout Management

- **Automatic Scheduling**: Timeouts scheduled on escalation creation
- **Persistent Timers**: Restored from database on server restart
- **Cleanup Handlers**: Automatic cleanup of completed timers

## Future Enhancements

- [ ] Voice activity detection (VAD) for automatic recording control
- [ ] Multi-language support for voice and text
- [ ] Sentiment analysis for escalation prioritization
- [ ] Analytics dashboard for conversation metrics
- [ ] Mobile app with native speech recognition
- [ ] Integration with calendar systems for scheduling
- [ ] SMS/WhatsApp integration for notifications
- [ ] Video call support with screen sharing
- [ ] Automated follow-up messages
- [ ] Customer satisfaction surveys

## Support & Contributing

For issues or questions:

- Check error logs in browser console and terminal
- Verify all environment variables are properly configured
- Review Troubleshooting section above
- Check database connection status in Supabase dashboard

## License

This project is for educational and demonstration purposes.

---

Built for providing exceptional customer service through AI-powered voice assistance.
