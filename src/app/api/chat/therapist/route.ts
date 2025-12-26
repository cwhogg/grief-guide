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

    // Check for crisis language with severity levels
    const crisisCheck = detectCrisisLanguage(message);
    if (crisisCheck.isCrisis) {
      console.warn(`Crisis language detected (severity: ${crisisCheck.severity}):`, crisisCheck.indicators);
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

    // Add crisis handling instructions based on severity
    if (crisisCheck.severity === "high") {
      systemPrompt += `

## URGENT: HIGH SEVERITY CRISIS DETECTED

The user's message contains language indicating immediate risk of self-harm or suicide. This is your ONLY priority right now.

IMMEDIATE RESPONSE REQUIRED:
1. Express genuine care: "I'm really glad you told me this—that took a lot of courage."
2. Acknowledge the pain: "It sounds like you're in tremendous pain right now."
3. Prioritize safety: "I want to make sure you're safe."
4. Provide resources: "Please reach out to the 988 Suicide and Crisis Lifeline right now—you can call or text 988, 24/7."
5. Stay present: "I'm here with you. Can we talk about getting you connected to someone who can help?"
6. Don't minimize: Take everything they say seriously.
7. Don't change the subject: Stay with this until they're connected to help.

DO NOT:
- Panic or be alarmist in your tone (be calm but serious)
- Ignore or downplay what they said
- Jump to other topics
- Offer platitudes like "things will get better"
- Try to "fix" their problems
- Leave them alone in this moment`;
    } else if (crisisCheck.severity === "medium") {
      systemPrompt += `

## IMPORTANT: CONCERNING LANGUAGE DETECTED

The user's message contains language that may indicate passive suicidal ideation or significant distress. This needs careful attention.

RESPONSE GUIDANCE:
1. Gently explore: "When you say you want to [their words], can you tell me more about that?"
2. Assess directly but compassionately: "Are you having thoughts of hurting yourself?"
3. Validate the pain behind the words: "It sounds like you're carrying something really heavy."
4. Have 988 ready: If they confirm suicidal thoughts, provide the 988 Suicide and Crisis Lifeline.
5. Don't assume—ask: Sometimes these phrases are expressions of exhaustion, not suicidality.

Be present, be gentle, but don't ignore what they said.`;
    } else if (crisisCheck.needsProfessionalHelp) {
      systemPrompt += `

## NOTE: Signs of Needed Professional Support

The user's message suggests they may be struggling significantly and could benefit from professional grief counseling. Multiple concerning indicators detected.

GUIDANCE:
- Don't bring this up immediately—let the conversation flow naturally first
- At an appropriate moment, gently explore: "It sounds like you've been carrying this for a while..."
- If they're open, suggest: "Have you thought about talking to a grief counselor? There's no shame in getting extra support."
- Plant the seed without pushing
- Continue providing support regardless of their answer`;
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
