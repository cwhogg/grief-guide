import { openai } from "@/lib/openai/client";
import {
  buildGuideSystemPrompt,
  formatMessagesForAPI,
  type GuideAgentContext,
} from "@/lib/agents/guide";
import type { Task, Profile } from "@/lib/supabase/types";

export const runtime = "nodejs";

// Demo mode profile
const DEMO_PROFILE: Profile = {
  id: "demo-user-123",
  email: "demo@griefguide.app",
  full_name: "Demo User",
  avatar_url: null,
  onboarding_completed: true,
  grief_stage: "immediate",
  user_role: "executor",
  state: "California",
  deceased_name: "Mom",
  deceased_had_spouse: false,
  deceased_had_will: true,
  deceased_had_trust: false,
  deceased_owned_property: true,
  deceased_had_retirement_accounts: true,
  has_surviving_parent: false,
  number_of_siblings: 1,
  check_in_frequency: "weekly",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Demo tasks (subset for context)
const DEMO_TASKS: Partial<Task>[] = [
  {
    id: "1",
    title: "Obtain death certificates",
    status: "pending",
    timeline_category: "immediate",
    task_type: "paperwork",
    priority: 1,
  },
  {
    id: "2",
    title: "Notify Social Security",
    status: "pending",
    timeline_category: "first_week",
    task_type: "paperwork",
    priority: 1,
  },
  {
    id: "3",
    title: "Contact estate attorney",
    status: "pending",
    timeline_category: "first_week",
    task_type: "legal",
    priority: 2,
  },
];

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { message, history = [] } = body;

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build context for the agent (using demo data)
    const context: GuideAgentContext = {
      profile: DEMO_PROFILE,
      tasks: DEMO_TASKS as Task[],
      conversationHistory: history,
    };

    // Build system prompt
    const systemPrompt = buildGuideSystemPrompt(context);

    // Format messages for OpenAI
    const messages = formatMessagesForAPI(systemPrompt, history, message);

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Create a TransformStream to handle the streaming
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              const data = JSON.stringify({
                choices: [{ delta: { content } }],
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// GET - Not needed in demo mode
export async function GET() {
  return new Response(JSON.stringify({ conversations: [] }), {
    headers: { "Content-Type": "application/json" },
  });
}
