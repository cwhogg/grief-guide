"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChatInterface,
  QuickActions,
  type Message,
} from "@/components/chat/ChatInterface";
import { useUser } from "@/hooks/useUser";

const CONVERSATION_STARTERS = [
  "I just need to talk",
  "I'm having a hard day",
  "I keep thinking about them",
];

export default function TherapistChatPage() {
  const router = useRouter();
  const { user, profile, isLoading: userLoading, initialize } = useUser();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialGreeting, setInitialGreeting] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const historyRef = useRef<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!userLoading && profile && !profile.onboarding_completed) {
      router.push("/onboarding");
    }
  }, [userLoading, profile, router]);

  // Generate initial greeting
  useEffect(() => {
    if (profile && !initialGreeting) {
      const name = profile.full_name?.split(" ")[0];
      const greetings = [
        `Hi${name ? ` ${name}` : ""}. How are you doing today—really?`,
        `Hi${name ? ` ${name}` : ""}. No agenda here. What's on your mind?`,
        `Hi${name ? ` ${name}` : ""}. How are you holding up?`,
      ];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      setInitialGreeting(greeting);
      setIsReady(true);
    }
  }, [profile, initialGreeting]);

  const handleSendMessage = useCallback(
    async (message: string): Promise<ReadableStream<Uint8Array> | null> => {
      try {
        const response = await fetch("/api/chat/therapist", {
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

  const handleQuickAction = useCallback((action: string) => {
    const event = new CustomEvent("quickAction", { detail: action });
    window.dispatchEvent(event);
  }, []);

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
            href="/chat/guide"
            className="text-sm text-[var(--gray-600)] hover:text-[var(--gray-900)] px-3 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--gray-100)] transition-colors min-h-[36px] flex items-center"
          >
            Practical Help
          </Link>
        </div>
      </nav>

      {/* Warm banner */}
      <div className="bg-[var(--purple-light)]/30 border-b border-[var(--purple-light)] px-5 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--purple-light)] flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-[var(--purple-main)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-[var(--gray-700)]">
            Sometimes you just need to talk.
          </p>
        </div>
      </div>

      {/* Chat interface */}
      <div className="flex-1 flex flex-col min-h-0">
        <ChatInterface
          initialMessages={messages}
          initialGreeting={initialGreeting || undefined}
          onSendMessage={handleSendMessage}
          onMessagesChange={handleMessagesChange}
          placeholder="What's on your mind..."
          agentName="Emotional Support"
          agentDescription="Sometimes you just need to talk"
        />

        {/* Quick actions - only show when no messages yet or few messages */}
        {messages.length <= 1 && (
          <QuickActions
            actions={CONVERSATION_STARTERS}
            onSelect={handleQuickAction}
          />
        )}
      </div>

      {/* Crisis resources footer */}
      <div className="bg-white border-t border-[var(--gray-200)] px-5 py-3 safe-area-bottom">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-4">
              <span className="text-[var(--gray-500)]">Switch to:</span>
              <Link
                href="/chat/guide"
                className="text-[var(--primary-600)] hover:text-[var(--primary-700)] font-medium"
              >
                Practical Help
              </Link>
            </div>
            <div className="flex items-center gap-2 text-[var(--gray-500)]">
              <span>In crisis?</span>
              <a
                href="tel:988"
                className="text-[var(--purple-main)] hover:underline font-medium"
              >
                Call or text 988
              </a>
              <span className="text-[var(--gray-300)]">|</span>
              <a
                href="https://988lifeline.org/chat/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--purple-main)] hover:underline font-medium"
              >
                Chat online
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
