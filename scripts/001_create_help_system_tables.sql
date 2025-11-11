-- Create help_requests table
CREATE TABLE IF NOT EXISTS public.help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, resolved, unresolved, escalated
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  timeout_at TIMESTAMP WITH TIME ZONE DEFAULT now() + INTERVAL '5 minutes'
);

-- Create knowledge_base table for learned answers
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL UNIQUE,
  answer TEXT NOT NULL,
  category TEXT,
  confidence FLOAT DEFAULT 0.8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create help_request_history table to track all interactions
CREATE TABLE IF NOT EXISTS public.help_request_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  help_request_id UUID NOT NULL REFERENCES public.help_requests(id) ON DELETE CASCADE,
  agent_response TEXT,
  supervisor_approval BOOLEAN,
  supervisor_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create supervisor_responses table for storing supervisor overrides
CREATE TABLE IF NOT EXISTS public.supervisor_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  help_request_id UUID NOT NULL REFERENCES public.help_requests(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_request_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisor_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for help_requests (anyone can read/create, supervisors can update)
CREATE POLICY "help_requests_select_all" ON public.help_requests FOR SELECT USING (true);
CREATE POLICY "help_requests_insert_all" ON public.help_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "help_requests_update_all" ON public.help_requests FOR UPDATE USING (true);

-- RLS Policies for knowledge_base (anyone can read)
CREATE POLICY "knowledge_base_select_all" ON public.knowledge_base FOR SELECT USING (true);
CREATE POLICY "knowledge_base_insert_all" ON public.knowledge_base FOR INSERT WITH CHECK (true);
CREATE POLICY "knowledge_base_update_all" ON public.knowledge_base FOR UPDATE USING (true);

-- RLS Policies for help_request_history (anyone can read/create)
CREATE POLICY "help_request_history_select_all" ON public.help_request_history FOR SELECT USING (true);
CREATE POLICY "help_request_history_insert_all" ON public.help_request_history FOR INSERT WITH CHECK (true);

-- RLS Policies for supervisor_responses (anyone can read/create)
CREATE POLICY "supervisor_responses_select_all" ON public.supervisor_responses FOR SELECT USING (true);
CREATE POLICY "supervisor_responses_insert_all" ON public.supervisor_responses FOR INSERT WITH CHECK (true);
