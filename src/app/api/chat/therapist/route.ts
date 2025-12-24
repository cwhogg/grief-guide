import { createClient } from "@/lib/supabase/server";
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await request.json();
    const { message, conversationId, history = [] } = body;

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check for crisis language
    const crisisCheck = detectCrisisLanguage(message);
    if (crisisCheck.isCrisis) {
      // Log crisis detection for safety (in production, you might alert a human)
      console.warn("Crisis language detected for user:", user.id, crisisCheck.indicators);
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Analyze sentiment from conversation history
    const sentiment = analyzeSentiment(history);

    // Build context for the agent
    const context: TherapistAgentContext = {
      profile: profile as Profile,
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
      temperature: 0.8, // Slightly higher for more natural, warm responses
      max_tokens: 800, // Keep responses focused
      presence_penalty: 0.3, // Encourage variety
      frequency_penalty: 0.3,
    });

    // Create a TransformStream to handle the streaming
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = "";

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              // Send SSE format
              const data = JSON.stringify({
                choices: [{ delta: { content } }],
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // Save conversation to database
          await saveConversation(
            supabase,
            user.id,
            conversationId,
            message,
            fullContent,
            sentiment,
            crisisCheck.isCrisis
          );

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

async function saveConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  conversationId: string | null,
  userMessage: string,
  assistantMessage: string,
  sentiment: string,
  hasCrisisIndicators: boolean
) {
  try {
    let convId = conversationId;

    // Create new conversation if needed
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          agent_type: "emotional",
          title: "Emotional support session",
        })
        .select()
        .single();

      if (convError) {
        console.error("Error creating conversation:", convError);
        return;
      }

      convId = newConv.id;
    }

    // Save messages with metadata
    const { error: messagesError } = await supabase.from("messages").insert([
      {
        conversation_id: convId,
        role: "user",
        content: userMessage,
      },
      {
        conversation_id: convId,
        role: "assistant",
        content: assistantMessage,
      },
    ]);

    if (messagesError) {
      console.error("Error saving messages:", messagesError);
    }

    // Update conversation with latest sentiment
    // In a production app, you might store this in a separate analytics table
    const { error: updateError } = await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId);

    if (updateError) {
      console.error("Error updating conversation:", updateError);
    }

    // Log crisis indicators for safety monitoring (in production, alert appropriate staff)
    if (hasCrisisIndicators) {
      console.warn(`Crisis indicators in conversation ${convId} for user ${userId}`);
      // In production: Send alert to support team, flag for review, etc.
    }
  } catch (error) {
    console.error("Error in saveConversation:", error);
  }
}

// GET - Load conversation history
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (conversationId) {
      // Fetch specific conversation
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Messages fetch error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch messages" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify({ messages }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch recent emotional support conversations
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("agent_type", "emotional")
      .order("updated_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Conversations fetch error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch conversations" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ conversations }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Therapist GET error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
