-- Add missing tables for chat functionality

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'customer', -- customer, supervisor, agent
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  title TEXT,
  status TEXT DEFAULT 'open', -- open, escalated, resolved, closed
  agent_status TEXT DEFAULT 'processing', -- processing, confident, uncertain, escalated
  confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  role TEXT NOT NULL, -- "user", "agent", "supervisor"
  content TEXT NOT NULL,
  confidence FLOAT,
  is_escalated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create escalations table
CREATE TABLE IF NOT EXISTS public.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID UNIQUE NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  agent_response TEXT,
  reason TEXT,
  supervisor_id UUID REFERENCES public.users(id),
  supervisor_note TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Remove the UNIQUE constraint from knowledge_base.question if it exists
-- This will make it compatible with the Prisma schema
ALTER TABLE public.knowledge_base DROP CONSTRAINT IF EXISTS knowledge_base_question_key;

-- Enable RLS on new tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users (anyone can read/create)
CREATE POLICY "users_select_all" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_insert_all" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_all" ON public.users FOR UPDATE USING (true);

-- RLS Policies for conversations (anyone can read/create)
CREATE POLICY "conversations_select_all" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "conversations_insert_all" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "conversations_update_all" ON public.conversations FOR UPDATE USING (true);

-- RLS Policies for messages (anyone can read/create)
CREATE POLICY "messages_select_all" ON public.messages FOR SELECT USING (true);
CREATE POLICY "messages_insert_all" ON public.messages FOR INSERT WITH CHECK (true);

-- RLS Policies for escalations (anyone can read/create)
CREATE POLICY "escalations_select_all" ON public.escalations FOR SELECT USING (true);
CREATE POLICY "escalations_insert_all" ON public.escalations FOR INSERT WITH CHECK (true);
CREATE POLICY "escalations_update_all" ON public.escalations FOR UPDATE USING (true);

-- Create an anonymous user for chat functionality
INSERT INTO public.users (id, email, name, role) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'anonymous@example.com', 'Anonymous User', 'customer')
ON CONFLICT (email) DO NOTHING;
