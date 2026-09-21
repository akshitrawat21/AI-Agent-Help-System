/**
 * Seeds a demo workspace so the app has something to show on first run:
 * a team, a knowledge base, resolved conversations for the dashboard charts,
 * and two escalations waiting in the queue.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { requireDatabaseUrl } from "../scripts/lib/database-url.mjs";

// Runnable on its own via `npm run seed`, so validate here too.
requireDatabaseUrl();

const scryptAsync = promisify(scrypt);
const db = new PrismaClient();

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

const ARTICLES = [
  {
    question: "What are your business hours?",
    answer:
      "We're open Monday to Friday, 9am to 6pm Eastern. Weekend support is email-only, and we reply within one business day.",
    category: "General",
  },
  {
    question: "How do I reset my password?",
    answer:
      'Click "Forgot password" on the sign-in screen and enter your email. The reset link lands within a couple of minutes and stays valid for one hour. If it does not arrive, check your spam folder before trying again.',
    category: "Account",
  },
  {
    question: "What is your refund policy?",
    answer:
      "You can request a full refund within 30 days of purchase, no questions asked. Refunds return to the original payment method and take 5-10 business days to appear.",
    category: "Billing",
  },
  {
    question: "How long does shipping take?",
    answer:
      "Standard shipping is 3-5 business days in the continental US. Express is 1-2 business days. International orders typically arrive within 7-14 business days depending on customs.",
    category: "Shipping",
  },
  {
    question: "Can I change or cancel my order after placing it?",
    answer:
      'Yes, as long as the order has not shipped. Open the order in your account and choose "Modify order". Once it has shipped you will need to use the returns process instead.',
    category: "Shipping",
  },
  {
    question: "Do you offer team or volume pricing?",
    answer:
      "Team plans start at 5 seats with 20% off list price, and volume discounts begin at 25 seats. Contact sales and we will put together a quote.",
    category: "Billing",
  },
  {
    question: "How do I update my billing details?",
    answer:
      'Go to Settings, then Billing, and choose "Update payment method". Changes apply to your next invoice — current-cycle charges are already authorized.',
    category: "Billing",
  },
  {
    question: "Is my data encrypted?",
    answer:
      "Yes. Data is encrypted in transit with TLS 1.3 and at rest with AES-256. We are SOC 2 Type II certified and undergo annual third-party penetration testing.",
    category: "Technical",
  },
  {
    question: "How do I export my data?",
    answer:
      'Settings, then Data, then "Request export". We assemble a JSON archive and email you a download link within an hour. Links expire after 24 hours.',
    category: "Technical",
  },
  {
    question: "Can I add teammates to my account?",
    answer:
      'Yes. Open Team and choose "Invite teammate". Admins can manage the assistant and knowledge base; agents can answer escalations and reply in the inbox.',
    category: "Account",
  },
  {
    question: "What integrations do you support?",
    answer:
      "We integrate with Slack, Zendesk, HubSpot, Salesforce and Zapier out of the box, and expose a REST API plus webhooks for anything else.",
    category: "Product",
  },
  {
    question: "Do you have a mobile app?",
    answer:
      "Yes, on iOS and Android. Both support the full inbox and escalation queue, including push notifications when something needs a human.",
    category: "Product",
  },
];

/** [visitorMessage, assistantReply, confidence] */
const RESOLVED_CONVERSATIONS = [
  [
    "What time do you close today?",
    "We're open Monday to Friday, 9am to 6pm Eastern. Weekend support is email-only, and we reply within one business day.",
    0.94,
  ],
  [
    "i forgot my password, help",
    'Click "Forgot password" on the sign-in screen and enter your email. The reset link lands within a couple of minutes and stays valid for one hour.',
    0.91,
  ],
  [
    "how long will my order take to arrive",
    "Standard shipping is 3-5 business days in the continental US. Express is 1-2 business days. International orders typically arrive within 7-14 business days depending on customs.",
    0.88,
  ],
  [
    "Can I get a refund?",
    "You can request a full refund within 30 days of purchase, no questions asked. Refunds return to the original payment method and take 5-10 business days to appear.",
    0.93,
  ],
  [
    "is my data secure",
    "Yes. Data is encrypted in transit with TLS 1.3 and at rest with AES-256. We are SOC 2 Type II certified and undergo annual third-party penetration testing.",
    0.9,
  ],
  [
    "do you integrate with slack",
    "We integrate with Slack, Zendesk, HubSpot, Salesforce and Zapier out of the box, and expose a REST API plus webhooks for anything else.",
    0.86,
  ],
  [
    "I need to add two people to my plan",
    'Yes. Open Team and choose "Invite teammate". Admins can manage the assistant and knowledge base; agents can answer escalations and reply in the inbox.',
    0.82,
  ],
  [
    "how do i export everything",
    'Settings, then Data, then "Request export". We assemble a JSON archive and email you a download link within an hour.',
    0.87,
  ],
  [
    "whats your volume pricing like",
    "Team plans start at 5 seats with 20% off list price, and volume discounts begin at 25 seats. Contact sales and we will put together a quote.",
    0.84,
  ],
  [
    "Can I cancel an order I just placed?",
    'Yes, as long as the order has not shipped. Open the order in your account and choose "Modify order".',
    0.89,
  ],
];

/** Questions the knowledge base genuinely cannot answer — these escalate. */
const PENDING_ESCALATIONS = [
  {
    question:
      "My invoice from March shows a $240 charge but my plan is $99/month. What is the extra $141 for?",
    reason: "no_match",
    confidence: 0.14,
    draftAnswer:
      'Go to Settings, then Billing, and choose "Update payment method". Changes apply to your next invoice — current-cycle charges are already authorized.',
  },
  {
    question:
      "We are a hospital in Germany — can you sign a BAA, and does your EU data residency cover GDPR Article 9 health data?",
    reason: "no_match",
    confidence: 0.09,
    draftAnswer:
      "Yes. Data is encrypted in transit with TLS 1.3 and at rest with AES-256. We are SOC 2 Type II certified and undergo annual third-party penetration testing.",
  },
];

const ANSWERED_ESCALATION = {
  question: "Do you offer a student discount?",
  answer:
    "We do — students get 40% off any individual plan. Email your .edu address to support and we will apply it to your account within one business day.",
  confidence: 0.22,
};

// Must match escalationMessage() in lib/ai/index.ts so the demo transcript
// reads exactly like a real one.
const ESCALATION_HOLD_MESSAGE =
  "I want to get this right, so I've passed it to a teammate. They'll reply here shortly — thanks for bearing with me.";

/** Matches what the widget route issues, so seeded threads are resumable. */
function visitorToken() {
  return randomBytes(32).toString("hex");
}

function daysAgo(days, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return date;
}

async function main() {
  console.log("Seeding demo workspace...");

  // Idempotent: wipe the demo org so re-running gives a clean, known state.
  const existing = await db.organization.findUnique({
    where: { slug: "northwind" },
  });
  if (existing) {
    await db.organization.delete({ where: { id: existing.id } });
    console.log("  removed previous demo workspace");
  }
  await db.user.deleteMany({
    where: {
      email: {
        in: [
          "root@example.com",
          "demo@example.com",
          "sam@example.com",
          "riley@example.com",
        ],
      },
    },
  });

  const org = await db.organization.create({
    data: {
      name: "Northwind Supply",
      slug: "northwind",
      agentConfig: {
        create: {
          agentName: "Aria",
          greeting:
            "Hi! I'm Aria. Ask me anything about orders, billing or your account.",
          persona:
            "You are a friendly, concise customer support assistant for Northwind Supply. Answer using the knowledge base. Never invent facts.",
          tone: "friendly",
          confidenceThreshold: 0.6,
          escalationTimeout: 30,
          provider: "local",
          model: "claude-opus-5",
        },
      },
    },
  });

  const password = await hashPassword("demo1234");

  await db.user.create({
    data: {
      email: "root@example.com",
      name: "Jordan Lee",
      passwordHash: password,
      avatarColor: "rose",
      isSuperAdmin: true,
      memberships: { create: { orgId: org.id, role: "owner" } },
    },
  });

  await db.user.create({
    data: {
      email: "demo@example.com",
      name: "Alex Morgan",
      passwordHash: password,
      avatarColor: "blue",
      memberships: { create: { orgId: org.id, role: "owner" } },
    },
  });

  const admin = await db.user.create({
    data: {
      email: "sam@example.com",
      name: "Sam Chen",
      passwordHash: password,
      avatarColor: "violet",
      memberships: { create: { orgId: org.id, role: "admin" } },
    },
  });

  await db.user.create({
    data: {
      email: "riley@example.com",
      name: "Riley Diaz",
      passwordHash: password,
      avatarColor: "emerald",
      memberships: { create: { orgId: org.id, role: "agent" } },
    },
  });

  let articleCount = 0;
  for (const article of ARTICLES) {
    const authored = daysAgo(30 - articleCount * 2, 11);
    await db.knowledgeArticle.create({
      data: {
        ...article,
        orgId: org.id,
        useCount: Math.floor(Math.random() * 40),
        createdAt: authored,
        updatedAt: authored,
      },
    });
    articleCount += 1;
  }
  console.log(`  ${articleCount} knowledge articles`);

  // Two weeks of traffic with a weekday/weekend rhythm, so the dashboard's
  // trend line has the shape a real workspace would show rather than a flat
  // one-per-day line.
  const WINDOW_DAYS = 14;
  let conversationCount = 0;

  for (let offset = WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const day = daysAgo(offset, 10);
    const weekend = day.getDay() === 0 || day.getDay() === 6;

    // Volume drifts upward over the window; weekends run much quieter.
    const base = 3 + Math.round(((WINDOW_DAYS - offset) / WINDOW_DAYS) * 4);
    const volume = weekend
      ? Math.max(1, Math.round(base * 0.35))
      : base + Math.floor(Math.random() * 3);

    for (let index = 0; index < volume; index += 1) {
      const [question, answer, confidence] =
        RESOLVED_CONVERSATIONS[conversationCount % RESOLVED_CONVERSATIONS.length];

      // Spread each day's conversations across working hours.
      const when = new Date(day);
      when.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0, 0);

      const conversation = await db.conversation.create({
        data: {
          orgId: org.id,
          title: question.slice(0, 60),
          channel: conversationCount % 5 === 0 ? "voice" : "widget",
          status: "resolved",
          visitorToken: visitorToken(),
          createdAt: when,
          updatedAt: when,
        },
      });

      await db.message.create({
        data: {
          conversationId: conversation.id,
          role: "visitor",
          content: question,
          createdAt: when,
        },
      });
      await db.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: answer,
          // Jitter the stored confidence a little so the average isn't a
          // suspiciously round number.
          confidence: Math.min(1, confidence + (Math.random() - 0.5) * 0.06),
          createdAt: new Date(when.getTime() + 4000),
        },
      });

      conversationCount += 1;
    }
  }
  console.log(`  ${conversationCount} resolved conversations over ${WINDOW_DAYS} days`);

  let escalationIndex = 0;
  for (const pending of PENDING_ESCALATIONS) {
    const when = daysAgo(0, 9 + escalationIndex);
    const conversation = await db.conversation.create({
      data: {
        orgId: org.id,
        title: pending.question.slice(0, 60),
        channel: "widget",
        status: "waiting",
        visitorToken: visitorToken(),
        createdAt: when,
        updatedAt: when,
      },
    });

    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: "visitor",
        content: pending.question,
        createdAt: when,
      },
    });
    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: ESCALATION_HOLD_MESSAGE,
        confidence: pending.confidence,
        createdAt: new Date(when.getTime() + 3000),
      },
    });

    await db.escalation.create({
      data: {
        orgId: org.id,
        conversationId: conversation.id,
        question: pending.question,
        draftAnswer: pending.draftAnswer,
        confidence: pending.confidence,
        reason: pending.reason,
        status: "pending",
        dueAt: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: when,
        updatedAt: when,
      },
    });
    escalationIndex += 1;
  }
  console.log(`  ${PENDING_ESCALATIONS.length} pending escalations`);

  // One escalation already answered by a human, plus the article it taught the
  // assistant — this is the learning loop, visible on first load.
  const answeredWhen = daysAgo(2, 14);
  const answeredConversation = await db.conversation.create({
    data: {
      orgId: org.id,
      title: ANSWERED_ESCALATION.question,
      channel: "widget",
      status: "resolved",
      visitorToken: visitorToken(),
      createdAt: answeredWhen,
      updatedAt: answeredWhen,
    },
  });

  await db.message.create({
    data: {
      conversationId: answeredConversation.id,
      role: "visitor",
      content: ANSWERED_ESCALATION.question,
      createdAt: answeredWhen,
    },
  });
  await db.message.create({
    data: {
      conversationId: answeredConversation.id,
      role: "human",
      content: ANSWERED_ESCALATION.answer,
      authorId: admin.id,
      createdAt: new Date(answeredWhen.getTime() + 1000 * 60 * 6),
    },
  });

  await db.escalation.create({
    data: {
      orgId: org.id,
      conversationId: answeredConversation.id,
      question: ANSWERED_ESCALATION.question,
      confidence: ANSWERED_ESCALATION.confidence,
      reason: "no_match",
      status: "answered",
      answer: ANSWERED_ESCALATION.answer,
      assigneeId: admin.id,
      answeredAt: new Date(answeredWhen.getTime() + 1000 * 60 * 6),
      dueAt: new Date(answeredWhen.getTime() + 30 * 60 * 1000),
      createdAt: answeredWhen,
      updatedAt: answeredWhen,
    },
  });

  await db.knowledgeArticle.create({
    data: {
      orgId: org.id,
      question: ANSWERED_ESCALATION.question,
      answer: ANSWERED_ESCALATION.answer,
      category: "Billing",
      source: "learned",
      createdAt: new Date(answeredWhen.getTime() + 1000 * 60 * 6),
      updatedAt: new Date(answeredWhen.getTime() + 1000 * 60 * 6),
    },
  });
  console.log("  1 answered escalation + the article it taught");

  console.log("\nDone. Sign in with:");
  console.log("  demo@example.com  / demo1234   (owner)");
  console.log("  sam@example.com   / demo1234   (admin)");
  console.log("  riley@example.com / demo1234   (agent)");
  console.log("  root@example.com  / demo1234   (platform admin)");
  console.log(`\nPublic assistant: /w/${org.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
