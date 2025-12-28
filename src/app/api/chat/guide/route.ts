import { openai } from "@/lib/openai/client";
import {
  buildGuideSystemPrompt,
  formatMessagesForAPI,
  type GuideAgentContext,
} from "@/lib/agents/guide";
import { getTasksForUser } from "@/lib/tasks/loader";
import type { Profile } from "@/lib/supabase/types";
import { cookies } from "next/headers";

export const runtime = "nodejs";

async function getProfileFromCookies(): Promise<Profile | null> {
  try {
    const cookieStore = await cookies();
    const profileCookie = cookieStore.get("grief-guide-profile");
    if (profileCookie?.value) {
      return JSON.parse(profileCookie.value);
    }
  } catch (e) {
    console.error("Error reading profile cookie:", e);
  }
  return null;
}

// Fallback demo profile
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
  knows_will_status: "yes",
  knows_trust_status: "no",
  knows_property_status: "yes",
  knows_accounts_status: "yes",
  knows_insurance_status: "unknown",
  has_surviving_parent: false,
  number_of_siblings: 1,
  check_in_frequency: "weekly",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

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

    // Get profile from cookies or use demo
    const profile = (await getProfileFromCookies()) || DEMO_PROFILE;

    // Get tasks for this user
    const tasks = getTasksForUser({
      griefStage: profile.grief_stage || "immediate",
      userRole: profile.user_role || "executor",
      state: profile.state,
      knowsWill: profile.knows_will_status,
      knowsTrust: profile.knows_trust_status,
      knowsProperty: profile.knows_property_status,
      knowsAccounts: profile.knows_accounts_status,
      knowsInsurance: profile.knows_insurance_status,
    });

    // Build context for the agent
    const context: GuideAgentContext = {
      profile,
      tasks,
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
