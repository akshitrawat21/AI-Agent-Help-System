import { AssistantSettings } from "@/components/app/assistant-settings";
import { PageHeader } from "@/components/app/page-header";
import { can, requireSession } from "@/lib/auth/guard";
import { getAgentConfig } from "@/lib/agent-config";

export const metadata = { title: "Assistant" };

export default async function AssistantPage() {
  const session = await requireSession();
  const config = await getAgentConfig(session.org.id);

  const { apiKey, ...rest } = config;

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Assistant"
        description="How your assistant behaves, when it hands off, and which engine writes its replies."
      />
      <AssistantSettings
        initial={{
          agentName: rest.agentName,
          greeting: rest.greeting,
          persona: rest.persona,
          tone: rest.tone,
          confidenceThreshold: rest.confidenceThreshold,
          escalationTimeout: rest.escalationTimeout,
          autoLearn: rest.autoLearn,
          voiceEnabled: rest.voiceEnabled,
          collectVisitorDetails: rest.collectVisitorDetails,
          provider: rest.provider,
          model: rest.model,
          hasApiKey: Boolean(apiKey),
        }}
        canEdit={can(session.role, "admin")}
      />
    </div>
  );
}
