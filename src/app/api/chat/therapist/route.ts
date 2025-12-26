import { openai } from "@/lib/openai/client";
import {
  buildTherapistSystemPrompt,
  formatMessagesForAPI,
  detectCrisisLanguage,
  analyzeSentiment,
  type TherapistAgentContext,
} from "@/lib/agents/therapist";
import type { Profile } from "@/lib/supabase/types";

export const runtime = "nodejs";

// Demo mode profile
const DEMO_PROFILE: Profile = {
  id: "demo-user-123",
  email: "demo@griefguide.app",
  full_name: "Demo User",
  avatar_url: null,
  onboarding_completed: true,
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

    // Check for crisis language
    const crisisCheck = detectCrisisLanguage(message);
    if (crisisCheck.isCrisis) {
      console.warn("Crisis language detected:", crisisCheck.indicators);
    }

    // Analyze sentiment from conversation history
    const sentiment = analyzeSentiment(history);

    // Build context for the agent (using demo profile)
    const context: TherapistAgentContext = {
      profile: DEMO_PROFILE,
      conversationHistory: history,
      recentSentiment: sentiment,
    };

    // Build system prompt
    let systemPrompt = buildTherapistSystemPrompt(context);

    // Add crisis handling instructions if crisis detected
    if (crisisCheck.isCrisis) {
      systemPrompt += `

## IMPORTANT: Crisis Detected in This Message

The user's message contains concerning language that may indicate suicidal thoughts or self-harm. This is your highest priority.

Respond with:
1. Express genuine care and concern
2. Thank them for sharing something so difficult
3. Provide the 988 Suicide and Crisis Lifeline (call or text 988)
4. Encourage them to reach out to the lifeline or a trusted person
5. Let them know they matter and deserve support
6. Stay present and don't change the subject

Do NOT:
- Panic or be alarmist
- Ignore the crisis indicators
- Jump to logistics or other topics
- Provide generic platitudes`;
    } else if (crisisCheck.needsProfessionalHelp) {
      systemPrompt += `

## Note: Signs of Needed Professional Support

The user's message suggests they may benefit from professional grief counseling. At an appropriate moment (not immediately), gently explore whether they've considered talking to a grief counselor. Don't push, but plant the seed.`;
    }

    // Format messages for OpenAI
    const messages = formatMessagesForAPI(systemPrompt, history, message);

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      stream: true,
      temperature: 0.8,
      max_tokens: 800,
      presence_penalty: 0.3,
      frequency_penalty: 0.3,
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
    console.error("Therapist API error:", error);
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
