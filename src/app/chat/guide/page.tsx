"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChatInterface, QuickActions, type Message } from "@/components/chat/ChatInterface";
import { useUser } from "@/hooks/useUser";

const SUGGESTED_QUESTIONS = [
  "What should I focus on first?",
  "How do I find the will?",
  "What documents do I need?",
  "Help me with a blocked task",
];

export default function GuideChatPage() {
  const router = useRouter();
  const { user, profile, isLoading: userLoading, initialize } = useUser();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialGreeting, setInitialGreeting] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!userLoading && profile && !profile.onboarding_completed) {
      router.push("/onboarding");
    }
  }, [userLoading, profile, router]);

  // Generate initial greeting based on user context
  useEffect(() => {
    if (profile && !initialGreeting) {
      const name = profile.full_name?.split(" ")[0] || "there";
      const greeting = `Hi ${name}. I'm here to help you navigate through everything that needs to be done. What would you like to focus on today?`;
      setInitialGreeting(greeting);
      setIsReady(true);
    }
  }, [profile, initialGreeting]);

  const handleSendMessage = useCallback(
    async (message: string): Promise<ReadableStream<Uint8Array> | null> => {
      try {
        const response = await fetch("/api/chat/guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversationId,
            history: historyRef.current,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        // Update history for next request
        historyRef.current = [
          ...historyRef.current,
          { role: "user", content: message },
        ];

        return response.body;
      } catch (error) {
        console.error("Send message error:", error);
        return null;
      }
    },
    [conversationId]
  );

  const handleMessagesChange = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);

    // Update history ref with latest messages
    historyRef.current = newMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));
  }, []);

  const handleQuickAction = useCallback(
    (action: string) => {
      // Trigger the send through the chat interface
      // This is a bit of a workaround - in production you might want to expose a send method
      const event = new CustomEvent("quickAction", { detail: action });
      window.dispatchEvent(event);
    },
    []
  );

  if (userLoading || !isReady) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--foreground-muted)]">Loading...</div>
      </div>
    );
  }

  if (!profile?.onboarding_completed) {
    return null;
  }

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-[var(--background)]">
      {/* Navigation bar */}
      <nav className="bg-white border-b border-[var(--gray-200)] px-5 py-2 flex items-center justify-between safe-area-top">
        <div className="flex items-center gap-4">
          <Link
            href="/chat"
            className="text-[var(--gray-600)] hover:text-[var(--gray-900)] transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <span className="text-[var(--gray-900)] font-medium">Grief Guide</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/tasks"
            className="text-sm text-[var(--gray-600)] hover:text-[var(--gray-900)] px-3 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--gray-100)] transition-colors min-h-[36px] flex items-center"
          >
            Tasks
          </Link>
          <Link
            href="/chat/therapist"
            className="text-sm text-[var(--gray-600)] hover:text-[var(--gray-900)] px-3 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--gray-100)] transition-colors min-h-[36px] flex items-center"
          >
            Emotional Support
          </Link>
        </div>
      </nav>

      {/* Chat interface */}
      <div className="flex-1 flex flex-col min-h-0">
        <ChatInterface
          initialMessages={messages}
          initialGreeting={initialGreeting || undefined}
          onSendMessage={handleSendMessage}
          onMessagesChange={handleMessagesChange}
          placeholder="Ask me anything about what you need to do..."
          agentName="Guide"
          agentDescription="Here to help you navigate what comes next"
        />

        {/* Quick actions - only show when no messages yet or few messages */}
        {messages.length <= 1 && (
          <QuickActions
            actions={SUGGESTED_QUESTIONS}
            onSelect={handleQuickAction}
          />
        )}
      </div>

      {/* Agent switcher */}
      <div className="bg-white border-t border-[var(--gray-200)] px-5 py-3 safe-area-bottom">
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="text-[var(--gray-500)]">Switch to:</span>
          <Link
            href="/chat/therapist"
            className="text-[var(--primary-600)] hover:text-[var(--primary-700)] font-medium"
          >
            Emotional Support
          </Link>
          <Link
            href="/chat/legal"
            className="text-[var(--primary-600)] hover:text-[var(--primary-700)] font-medium"
          >
            Legal Questions
          </Link>
          <Link
            href="/chat/financial"
            className="text-[var(--primary-600)] hover:text-[var(--primary-700)] font-medium"
          >
            Financial Help
          </Link>
        </div>
      </div>
    </div>
  );
}
