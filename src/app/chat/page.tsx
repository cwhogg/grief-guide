"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";

// Types
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

type ChatMode = "guide" | "therapist";

// Suggested prompts by mode and context
const GUIDE_PROMPTS = [
  "What matters most right now?",
  "I just need to talk",
];

const THERAPIST_PROMPTS = [
  "I'm having a hard day",
  "Back to practical stuff",
];

export default function ChatPage() {
  const router = useRouter();
  const { profile, isLoading: userLoading, initialize } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [mode, setMode] = useState<ChatMode>("guide");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const hasGreeted = useRef(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!userLoading && profile && !profile.onboarding_completed) {
      router.push("/onboarding");
    }
  }, [userLoading, profile, router]);

  // Generate initial greeting based on user context and stage
  useEffect(() => {
    if (profile && !hasGreeted.current && messages.length === 0) {
      hasGreeted.current = true;
      const name = profile.full_name?.split(" ")[0];
      const stage = profile.grief_stage;

      let greeting = "";
      const parentName = profile.deceased_name;
      if (stage === "anticipating") {
        greeting = `Hi${name ? ` ${name}` : ""}. I'm here to help you figure out what to ask and what to gather while you still can. What's on your mind?`;
      } else if (stage === "immediate") {
        greeting = `Hi${name ? ` ${name}` : ""}. There's a lot to handle right now${parentName ? ` after ${parentName}'s death` : ""}, but you don't have to figure it all out today. What's weighing on you most?`;
      } else {
        greeting = `Hi${name ? ` ${name}` : ""}. What can I help you with?`;
      }

      const greetingMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: greeting,
        timestamp: new Date(),
      };
      setMessages([greetingMessage]);
      historyRef.current = [{ role: "assistant", content: greeting }];
      setIsReady(true);
    }
  }, [profile, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(false);
    if (menuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [menuOpen]);

  // Detect mode switching triggers in user input
  const detectModeSwitch = useCallback((message: string): ChatMode | null => {
    const lowerMessage = message.toLowerCase();
    const therapistTriggers = [
      "i need to talk",
      "just need someone to listen",
      "i'm struggling",
      "i'm having a hard",
      "feeling overwhelmed",
      "i can't stop crying",
      "i miss them",
      "i miss him",
      "i miss her",
      "how am i supposed to feel",
      "i don't know how to feel",
    ];
    const guideTriggers = [
      "back to practical",
      "back to tasks",
      "what should i do",
      "what do i need to",
      "help me with",
      "next steps",
    ];

    if (mode === "guide" && therapistTriggers.some(t => lowerMessage.includes(t))) {
      return "therapist";
    }
    if (mode === "therapist" && guideTriggers.some(t => lowerMessage.includes(t))) {
      return "guide";
    }
    return null;
  }, [mode]);

  const switchMode = useCallback((newMode: ChatMode) => {
    if (newMode === mode) return;

    setMode(newMode);

    // Add a transition message
    const transitionMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: newMode === "therapist"
        ? "I hear you. Let's set the tasks aside for now. How are you doing—really?"
        : "Okay, back to the practical stuff. What would help to work on?",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, transitionMessage]);
    historyRef.current.push({ role: "assistant", content: transitionMessage.content });
  }, [mode]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isStreaming) return;

    // Check for mode switch
    const switchTo = detectModeSwitch(messageText);
    if (switchTo) {
      // Add user message first
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: messageText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      switchMode(switchTo);
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const endpoint = mode === "therapist" ? "/api/chat/therapist" : "/api/chat/guide";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history: historyRef.current,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      // Update history
      historyRef.current.push({ role: "user", content: messageText });

      const stream = response.body;
      if (!stream) throw new Error("No response stream");

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                fullContent += content;
                setStreamingContent(fullContent);
              }
            } catch {
              if (data && data !== "[DONE]" && !data.startsWith("{")) {
                fullContent += data;
                setStreamingContent(fullContent);
              }
            }
          }
        }
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullContent || "I'm sorry, I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      historyRef.current.push({ role: "assistant", content: assistantMessage.content });
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I'm sorry, something went wrong. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  }, [mode, isStreaming, detectModeSwitch, switchMode]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    handleSendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePromptClick = (prompt: string) => {
    if (prompt === "Back to practical stuff") {
      switchMode("guide");
    } else if (prompt === "I need to talk to someone") {
      handleSendMessage("I need to talk to someone");
    } else {
      handleSendMessage(prompt);
    }
  };

  if (userLoading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  if (!profile?.onboarding_completed) {
    return null;
  }

  const currentPrompts = mode === "therapist" ? THERAPIST_PROMPTS : GUIDE_PROMPTS;
  const modeColor = mode === "therapist" ? "violet" : "amber";

  return (
    <div className="h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <header className={`bg-white border-b ${mode === "therapist" ? "border-violet-100" : "border-stone-200"} px-4 py-3`}>
        <div className="flex items-center justify-between">
          {/* Logo and title */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${mode === "therapist" ? "bg-violet-100" : "bg-amber-100"} flex items-center justify-center`}>
              {mode === "therapist" ? (
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              )}
            </div>
            <div>
              <h1 className="font-semibold text-stone-900">Grief Guide</h1>
              <p className="text-xs text-stone-500">
                {mode === "therapist" ? "Emotional support" : "Here to help"}
              </p>
            </div>
          </div>

          {/* Menu button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <svg className="w-6 h-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-50">
                <Link
                  href="/tasks"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors"
                >
                  <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="text-stone-700">View all tasks</span>
                </Link>
                <Link
                  href="/resources"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors"
                >
                  <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-stone-700">Find help</span>
                </Link>
                <div className="border-t border-stone-100 my-2" />
                <a
                  href="tel:988"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors"
                >
                  <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <span className="text-violet-700 font-medium">Crisis support (988)</span>
                    <p className="text-xs text-stone-500">24/7 help available</p>
                  </div>
                </a>
                <div className="border-t border-stone-100 my-2" />
                <Link
                  href="/onboarding"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-stone-500"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Therapist mode banner */}
      {mode === "therapist" && (
        <div className="bg-gradient-to-r from-violet-50 to-rose-50 border-b border-violet-100 px-4 py-2">
          <p className="text-sm text-violet-700 text-center">
            Sometimes you just need to talk.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} mode={mode} />
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={{
              id: "streaming",
              role: "assistant",
              content: streamingContent,
              timestamp: new Date(),
            }}
            mode={mode}
            isStreaming
          />
        )}

        {/* Typing indicator */}
        {isStreaming && !streamingContent && (
          <div className="flex gap-3">
            <div className={`w-8 h-8 rounded-full ${mode === "therapist" ? "bg-violet-100" : "bg-amber-100"} flex items-center justify-center flex-shrink-0`}>
              <div className="flex gap-1">
                <div className={`w-1.5 h-1.5 ${mode === "therapist" ? "bg-violet-400" : "bg-amber-400"} rounded-full animate-bounce`} />
                <div className={`w-1.5 h-1.5 ${mode === "therapist" ? "bg-violet-400" : "bg-amber-400"} rounded-full animate-bounce`} style={{ animationDelay: "0.1s" }} />
                <div className={`w-1.5 h-1.5 ${mode === "therapist" ? "bg-violet-400" : "bg-amber-400"} rounded-full animate-bounce`} style={{ animationDelay: "0.2s" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts - show when few messages */}
      {messages.length <= 2 && !isStreaming && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2 justify-center">
            {currentPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handlePromptClick(prompt)}
                className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                  mode === "therapist"
                    ? "border-violet-200 hover:bg-violet-50 text-violet-700"
                    : "border-stone-200 hover:bg-stone-50 text-stone-700"
                }`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-stone-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === "therapist" ? "Share what's on your mind..." : "Ask me anything..."}
              disabled={isStreaming}
              rows={1}
              className={`w-full px-4 py-3 border rounded-xl resize-none focus:ring-2 disabled:opacity-50 disabled:bg-stone-50 ${
                mode === "therapist"
                  ? "border-violet-200 focus:ring-violet-500 focus:border-violet-500"
                  : "border-stone-300 focus:ring-amber-600 focus:border-amber-600"
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className={`px-4 py-3 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              mode === "therapist"
                ? "bg-violet-600 hover:bg-violet-700"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  mode,
  isStreaming = false,
}: {
  message: Message;
  mode: ChatMode;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";
  const accentColor = mode === "therapist" ? "violet" : "amber";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-stone-200" : mode === "therapist" ? "bg-violet-100" : "bg-amber-100"
        }`}
      >
        {isUser ? (
          <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : mode === "therapist" ? (
          <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </div>

      {/* Message bubble */}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? mode === "therapist"
              ? "bg-violet-600 text-white rounded-tr-sm"
              : "bg-amber-600 text-white rounded-tr-sm"
            : "bg-white shadow-sm border border-stone-200 rounded-tl-sm"
        }`}
      >
        <div className={`whitespace-pre-wrap break-words ${isUser ? "text-white" : "text-stone-700"}`}>
          {message.content}
          {isStreaming && (
            <span className={`inline-block w-1.5 h-4 ml-0.5 ${mode === "therapist" ? "bg-violet-600" : "bg-amber-600"} animate-pulse`} />
          )}
        </div>
      </div>
    </div>
  );
}
