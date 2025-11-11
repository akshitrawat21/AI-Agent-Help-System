export interface HelpRequest {
  id: string;
  customer_name: string;
  customer_email: string;
  question: string;
  status: "pending" | "ai_responded" | "approved" | "rejected" | "resolved";
  created_at: string;
  updated_at: string;
}

export interface AIResponse {
  id: string;
  request_id: string;
  ai_response: string;
  confidence_score: number;
  knowledge_base_used: string[];
  created_at: string;
}

export interface SupervisorApproval {
  id: string;
  request_id: string;
  supervisor_id: string;
  approved: boolean;
  feedback: string;
  approved_response: string;
  created_at: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  confidence: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CallSimulation {
  id: string;
  request_id: string;
  webhook_url: string;
  payload: Record<string, any>;
  response_status: number;
  response_body: Record<string, any>;
  created_at: string;
}

export interface Escalation {
  id: string;
  conversationId: string;
  agentResponse: string;
  reason: string;
  resolved: boolean;
  messages: { id: string; role: string; content: string }[];
}
