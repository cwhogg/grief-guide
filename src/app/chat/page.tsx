"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { ChatTaskCard, parseMessageContent, generateContextualActions, MessageActions, type MessageAction } from "@/components/chat/ChatTaskCard";
import type { Task, TaskStatus } from "@/lib/supabase/types";

// Types
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestedPrompts?: string[];
}

type ChatMode = "guide" | "therapist";
type ConversationContext = "initial" | "task" | "emotional" | "general";

// Contextual prompts based on conversation state
const PROMPTS = {
  initial: [
    "What should I focus on first?",
    "I don't know where to start",
    "I just need to talk",
  ],
  task: [
    "Walk me through this",
    "What's next after this?",
    "I'm stuck on something",
    "I need a break",
  ],
  emotional: [
    "This is harder than I expected",
    "I don't know how I'm supposed to feel",
    "I think I'm ready to get back to practical stuff",
  ],
  general: [
    "What matters most right now?",
    "Help me with something specific",
    "I just need to talk",
  ],
  resources: [
    "Find a grief counselor",
    "I need legal help",
    "Help me find professionals",
  ],
};

const FIRST_VISIT_KEY = "grief-guide-chat-visited";

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskMap, setTaskMap] = useState<Map<string, Task>>(new Map());
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false);
  const [conversationContext, setConversationContext] = useState<ConversationContext>("initial");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const hasGreeted = useRef(false);
  const tasksFetched = useRef(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!userLoading && profile && !profile.onboarding_completed) {
      router.push("/onboarding");
    }
  }, [userLoading, profile, router]);

  // Check for first visit
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasVisited = localStorage.getItem(FIRST_VISIT_KEY);
      if (!hasVisited) {
        setShowFirstTimeHint(true);
      }
    }
  }, []);

  const dismissFirstTimeHint = () => {
    setShowFirstTimeHint(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(FIRST_VISIT_KEY, "true");
    }
  };

  // Fetch tasks
  useEffect(() => {
    if (profile && !tasksFetched.current) {
      tasksFetched.current = true;
      fetchTasks();
    }
  }, [profile]);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (profile?.grief_stage) params.append("grief_stage", profile.grief_stage);
      if (profile?.user_role) params.append("user_role", profile.user_role);
      if (profile?.state) params.append("state", profile.state);
      if (profile?.knows_will_status) params.append("knows_will", profile.knows_will_status);
      if (profile?.knows_trust_status) params.append("knows_trust", profile.knows_trust_status);
      if (profile?.knows_property_status) params.append("knows_property", profile.knows_property_status);
      if (profile?.knows_accounts_status) params.append("knows_accounts", profile.knows_accounts_status);
      if (profile?.knows_insurance_status) params.append("knows_insurance", profile.knows_insurance_status);

      const response = await fetch(`/api/tasks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
        const map = new Map<string, Task>();
        (data.tasks || []).forEach((task: Task) => map.set(task.id, task));
        setTaskMap(map);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  const handleTaskStatusChange = async (taskId: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    setTaskMap(prev => {
      const newMap = new Map(prev);
      const task = newMap.get(taskId);
      if (task) {
        newMap.set(taskId, { ...task, status });
      }
      return newMap;
    });
  };

  const handleTellMeMore = (task: Task) => {
    const message = `Tell me more about "${task.title}"`;
    handleSendMessage(message);
  };

  // Detect conversation context from messages
  const detectContext = useCallback((lastAssistantMessage: string, lastUserMessage: string): ConversationContext => {
    const combined = (lastAssistantMessage + " " + lastUserMessage).toLowerCase();

    // Check for task-related content
    const taskIndicators = ["task", "step", "document", "form", "certificate", "account", "bank", "insurance", "will", "probate", "estate"];
    if (taskIndicators.some(t => combined.includes(t))) {
      return "task";
    }

    // Check for emotional content
    const emotionalIndicators = ["feel", "hard", "difficult", "miss", "grief", "sad", "overwhelm", "cry", "tough", "struggle"];
    if (emotionalIndicators.some(t => combined.includes(t))) {
      return "emotional";
    }

    return "general";
  }, []);

  // Generate initial greeting based on user context and stage
  useEffect(() => {
    if (profile && !hasGreeted.current && messages.length === 0) {
      hasGreeted.current = true;
      const name = profile.full_name?.split(" ")[0];
      const stage = profile.grief_stage;
      const parentName = profile.deceased_name;

      let greeting = "";
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
        suggestedPrompts: PROMPTS.initial,
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
      "ready to look at practical",
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

    // Gentle transition messages
    const transitionMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: newMode === "therapist"
        ? "I'm here. Take your time."
        : "Okay, I'm here when you need to talk. Let's look at what's next.",
      timestamp: new Date(),
      suggestedPrompts: newMode === "therapist" ? PROMPTS.emotional : PROMPTS.task,
    };

    setMessages(prev => [...prev, transitionMessage]);
    historyRef.current.push({ role: "assistant", content: transitionMessage.content });
    setConversationContext(newMode === "therapist" ? "emotional" : "task");
  }, [mode]);

  // Generate suggested prompts based on response content
  const generateSuggestedPrompts = useCallback((content: string, userMessage: string): string[] => {
    const context = detectContext(content, userMessage);
    setConversationContext(context);

    // Check if response mentions specific tasks
    const mentionsTask = content.includes("[task:") ||
      /death certificate|will|probate|bank|insurance|account/i.test(content);

    if (mentionsTask) {
      return [
        "Walk me through this",
        "What else should I know?",
        "What's next after this?",
      ];
    }

    return PROMPTS[context];
  }, [detectContext]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isStreaming) return;

    // Check for mode switch
    const switchTo = detectModeSwitch(messageText);
    if (switchTo) {
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

      // Generate contextual prompts based on response
      const suggestedPrompts = generateSuggestedPrompts(fullContent, messageText);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullContent || "I'm sorry, I couldn't generate a response. Please try again.",
        timestamp: new Date(),
        suggestedPrompts,
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
  }, [mode, isStreaming, detectModeSwitch, switchMode, generateSuggestedPrompts]);

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
    handleSendMessage(prompt);
  };

  const handleHelpRequest = () => {
    setMenuOpen(false);
    handleSendMessage("How do I use Grief Guide? What can you help me with?");
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

  // Get current prompts - from last assistant message or based on context
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");
  const currentPrompts = lastAssistantMessage?.suggestedPrompts || PROMPTS[conversationContext];

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
                <button
                  onClick={handleHelpRequest}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-left"
                >
                  <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-stone-700">How to use Grief Guide</span>
                </button>
                <div className="border-t border-stone-100 my-2" />
                <Link
                  href="/tasks"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors"
                >
                  <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="text-stone-700">View all tasks</span>
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleSendMessage("I need help finding professionals - what kind of help is available?");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-left"
                >
                  <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-stone-700">Find help</span>
                </button>
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
                  href="/settings"
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

      {/* First-time guidance hint */}
      {showFirstTimeHint && (
        <div className="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-900 mb-3">
            You can ask me about what needs to be done, get help with specific tasks, or just talk when things feel heavy. I'm here for all of it.
          </p>
          <button
            onClick={dismissFirstTimeHint}
            className="text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
          >
            Got it
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            mode={mode}
            taskMap={taskMap}
            onTaskStatusChange={handleTaskStatusChange}
            onTellMeMore={handleTellMeMore}
            onSendMessage={handleSendMessage}
            isLastMessage={index === messages.length - 1 && !isStreaming}
          />
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
            taskMap={taskMap}
            onTaskStatusChange={handleTaskStatusChange}
            onTellMeMore={handleTellMeMore}
            onSendMessage={handleSendMessage}
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

      {/* Input area with suggested prompts */}
      <div className="border-t border-stone-200 bg-white">
        {/* Suggested prompts - always show below input when not streaming */}
        {!isStreaming && currentPrompts && currentPrompts.length > 0 && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex flex-wrap gap-2 justify-center">
              {currentPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handlePromptClick(prompt)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    mode === "therapist"
                      ? "border-violet-200 hover:bg-violet-50 text-violet-700"
                      : "border-stone-200 hover:bg-stone-50 text-stone-600"
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input form */}
        <div className="p-4 pt-2">
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

          {/* Subtle crisis support link */}
          <div className="text-center pb-2">
            <a
              href="tel:988"
              className="text-xs text-stone-400 hover:text-violet-600 transition-colors"
            >
              In crisis? Call or text 988
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  mode,
  taskMap,
  onTaskStatusChange,
  onTellMeMore,
  onSendMessage,
  isStreaming = false,
  isLastMessage = false,
}: {
  message: Message;
  mode: ChatMode;
  taskMap: Map<string, Task>;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  onTellMeMore: (task: Task) => void;
  onSendMessage: (message: string) => void;
  isStreaming?: boolean;
  isLastMessage?: boolean;
}) {
  const isUser = message.role === "user";

  // For user messages, just render plain text
  if (isUser) {
    return (
      <div className="flex gap-3 flex-row-reverse">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-stone-200">
          <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className={`max-w-[85%] rounded-2xl px-4 py-3 rounded-tr-sm ${
          mode === "therapist" ? "bg-violet-600 text-white" : "bg-amber-600 text-white"
        }`}>
          <div className="whitespace-pre-wrap break-words text-white">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // For assistant messages, parse content and generate actions
  const { segments, taskIds } = parseMessageContent(message.content);

  // Generate contextual actions for the last message (not streaming)
  const contextualActions = isLastMessage && !isStreaming
    ? generateContextualActions(message.content, taskIds[0])
    : [];

  // Handler for task actions from action buttons
  const handleTaskAction = async (taskId: string, action: "complete" | "skip" | "details") => {
    if (action === "details") {
      const task = taskMap.get(taskId);
      if (task) onTellMeMore(task);
    } else if (action === "complete") {
      await onTaskStatusChange(taskId, "completed");
    } else if (action === "skip") {
      await onTaskStatusChange(taskId, "skipped");
    }
  };

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        mode === "therapist" ? "bg-violet-100" : "bg-amber-100"
      }`}>
        {mode === "therapist" ? (
          <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </div>

      {/* Message content with embedded task cards and action buttons */}
      <div className="max-w-[85%] space-y-2">
        {segments.map((segment, index) => {
          if (segment.type === "text") {
            const isLastSegment = index === segments.length - 1;
            return (
              <div
                key={index}
                className="bg-white shadow-sm border border-stone-200 rounded-2xl rounded-tl-sm px-4 py-3"
              >
                <div className="whitespace-pre-wrap break-words text-stone-700">
                  {segment.content}
                  {isStreaming && isLastSegment && (
                    <span className={`inline-block w-1.5 h-4 ml-0.5 ${mode === "therapist" ? "bg-violet-600" : "bg-amber-600"} animate-pulse`} />
                  )}
                </div>

                {/* Inline action buttons for last text segment of last message */}
                {isLastSegment && isLastMessage && !isStreaming && contextualActions.length > 0 && taskIds.length === 0 && (
                  <MessageActions
                    actions={contextualActions}
                    onSendMessage={onSendMessage}
                    onTaskAction={handleTaskAction}
                  />
                )}
              </div>
            );
          } else if (segment.type === "task" && segment.taskId) {
            const task = taskMap.get(segment.taskId);
            if (task) {
              return (
                <ChatTaskCard
                  key={index}
                  task={task}
                  onStatusChange={onTaskStatusChange}
                  onTellMeMore={onTellMeMore}
                />
              );
            } else {
              // Task not found - show a helpful message instead of error
              return (
                <div key={index} className="my-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-700">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-sm font-medium">Task: {segment.taskId}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => onSendMessage(`Tell me more about "${segment.taskId}"`)}
                      className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
                    >
                      Tell me more
                    </button>
                  </div>
                </div>
              );
            }
          }
          return null;
        })}
      </div>
    </div>
  );
}
