import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/openai/client";
import {
  buildGuideSystemPrompt,
  formatMessagesForAPI,
  type GuideAgentContext,
} from "@/lib/agents/guide";
import type { Task, Profile } from "@/lib/supabase/types";

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

    // Fetch user's tasks
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("priority", { ascending: true });

    if (tasksError) {
      console.error("Tasks fetch error:", tasksError);
    }

    // Build context for the agent
    const context: GuideAgentContext = {
      profile: profile as Profile,
      tasks: (tasks || []) as Task[],
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
            fullContent
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
    console.error("Chat API error:", error);
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
  assistantMessage: string
) {
  try {
    let convId = conversationId;

    // Create new conversation if needed
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          agent_type: "general",
          title: userMessage.slice(0, 100),
        })
        .select()
        .single();

      if (convError) {
        console.error("Error creating conversation:", convError);
        return;
      }

      convId = newConv.id;
    }

    // Save messages
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
        return new Response(JSON.stringify({ error: "Failed to fetch messages" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ messages }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch recent conversations
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("agent_type", "general")
      .order("updated_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Conversations fetch error:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch conversations" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ conversations }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chat GET error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
