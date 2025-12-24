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
  "I just need someone to listen",
  "I'm having a hard day",
  "I don't know how I'm supposed to feel",
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
    if (!userLoading && !user) {
      router.push("/login");
    }
    if (!userLoading && profile && !profile.onboarding_completed) {
      router.push("/onboarding");
    }
  }, [userLoading, user, profile, router]);

  // Generate initial greeting
  useEffect(() => {
    if (profile && !initialGreeting) {
      const name = profile.full_name?.split(" ")[0];
      const greetings = [
        `Hi${name ? ` ${name}` : ""}. I'm here whenever you need someone to talk to. How are you doing today—really?`,
        `Hello${name ? ` ${name}` : ""}. There's no agenda here, just space for whatever you're feeling. What's on your mind?`,
        `Hi${name ? ` ${name}` : ""}. I know there's a lot going on. I'm here to listen. How are you holding up?`,
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
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  if (!user || !profile?.onboarding_completed) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-stone-50">
      {/* Navigation bar */}
      <nav className="bg-white border-b border-stone-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-stone-600 hover:text-stone-900 transition-colors"
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
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <span className="text-stone-900 font-medium">Grief Guide</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/tasks"
            className="text-sm text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            Tasks
          </Link>
          <Link
            href="/chat/guide"
            className="text-sm text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            Practical Help
          </Link>
        </div>
      </nav>

      {/* Warm banner */}
      <div className="bg-gradient-to-r from-violet-50 to-rose-50 border-b border-violet-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-violet-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-violet-800">
            This is a safe space. Whatever you're feeling is valid. Take your
            time.
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
          placeholder="Share what's on your mind..."
          agentName="Emotional Support"
          agentDescription="A safe space to process what you're feeling"
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
      <div className="bg-white border-t border-stone-200 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-4">
              <span className="text-stone-500">Switch to:</span>
              <Link
                href="/chat/guide"
                className="text-amber-600 hover:text-amber-700 font-medium"
              >
                Practical Help
              </Link>
            </div>
            <div className="flex items-center gap-2 text-stone-500">
              <span>In crisis?</span>
              <a
                href="tel:988"
                className="text-violet-600 hover:text-violet-700 font-medium"
              >
                Call or text 988
              </a>
              <span className="text-stone-300">|</span>
              <a
                href="https://988lifeline.org/chat/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:text-violet-700 font-medium"
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
