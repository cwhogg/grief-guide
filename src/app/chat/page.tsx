"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { ChatTaskCard, parseMessageContent, generateContextualActions, MessageActions, type MessageAction } from "@/components/chat/ChatTaskCard";
import { FuneralHomeSearch, parseFuneralHomeSearch } from "@/components/chat/FuneralHomeSearch";
import { ChatInput, parseInputRequest } from "@/components/chat/ChatInput";
import { PhoneButton, CallScriptCard, InteractiveChecklist, parseTaskFlowContent } from "@/components/chat/TaskFlowComponents";
import type { Task, TaskStatus } from "@/lib/supabase/types";

// Types
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestedPrompts?: string[];
  showWalkthrough?: boolean;
  showTopTasks?: boolean;
}

type ChatMode = "guide" | "therapist";
type ConversationContext = "initial" | "task" | "emotional" | "general";

// Contextual prompts based on conversation state
const PROMPTS = {
  initial: [
    "What should I do first?",
    "I don't know where to start",
    "Tell me what to do next",
    "I want help with my grief",
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
const CHAT_STORAGE_KEY = "grief-guide-chat-state";
const CACHE_VERSION_KEY = "grief-guide-cache-version";
// Increment this when task structure changes to force cache clear
const CURRENT_CACHE_VERSION = "10";

// Parse suggested prompts from message content
// Format: [prompts:Prompt 1|Prompt 2|Prompt 3]
function parseSuggestedPrompts(content: string): { prompts: string[]; remainingContent: string } {
  const pattern = /\[prompts:([^\]]+)\]/;
  const match = content.match(pattern);

  if (match) {
    const prompts = match[1].split("|").map(p => p.trim()).filter(p => p.length > 0);
    return {
      prompts,
      remainingContent: content.replace(pattern, "").trim(),
    };
  }

  return {
    prompts: [],
    remainingContent: content,
  };
}

interface StoredChatState {
  messages: Message[];
  mode: ChatMode;
  conversationContext: ConversationContext;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  lastUpdated: string;
}

function clearStaleCache(): void {
  if (typeof window === "undefined") return;
  try {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    if (storedVersion !== CURRENT_CACHE_VERSION) {
      // Cache version mismatch - clear old data
      localStorage.removeItem(CHAT_STORAGE_KEY);
      localStorage.removeItem(FIRST_VISIT_KEY);
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
      console.log("Cleared stale cache - version updated to", CURRENT_CACHE_VERSION);
    }
  } catch (e) {
    console.error("Failed to check cache version:", e);
  }
}

function loadChatState(): StoredChatState | null {
  if (typeof window === "undefined") return null;

  // Always check for stale cache first
  clearStaleCache();

  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredChatState;
      parsed.messages = parsed.messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      return parsed;
    }
  } catch (e) {
    console.error("Failed to load chat state:", e);
  }
  return null;
}

function saveChatState(state: StoredChatState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save chat state:", e);
  }
}

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
  const hasLoadedFromStorage = useRef(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!userLoading && profile && !profile.onboarding_completed) {
      router.push("/onboarding");
    }
  }, [userLoading, profile, router]);

  useEffect(() => {
    if (hasLoadedFromStorage.current) return;
    hasLoadedFromStorage.current = true;

    const stored = loadChatState();
    if (stored && stored.messages.length > 0) {
      setMessages(stored.messages);
      setMode(stored.mode);
      setConversationContext(stored.conversationContext);
      historyRef.current = stored.history;
      hasGreeted.current = true;
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;

    saveChatState({
      messages,
      mode,
      conversationContext,
      history: historyRef.current,
      lastUpdated: new Date().toISOString(),
    });
  }, [messages, mode, conversationContext]);

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

  const detectContext = useCallback((lastAssistantMessage: string, lastUserMessage: string): ConversationContext => {
    const combined = (lastAssistantMessage + " " + lastUserMessage).toLowerCase();

    const taskIndicators = ["task", "step", "document", "form", "certificate", "account", "bank", "insurance", "will", "probate", "estate"];
    if (taskIndicators.some(t => combined.includes(t))) {
      return "task";
    }

    const emotionalIndicators = ["feel", "hard", "difficult", "miss", "grief", "sad", "overwhelm", "cry", "tough", "struggle"];
    if (emotionalIndicators.some(t => combined.includes(t))) {
      return "emotional";
    }

    return "general";
  }, []);

  useEffect(() => {
    if (profile && !hasGreeted.current && messages.length === 0) {
      hasGreeted.current = true;
      const parentName = profile.deceased_name || "your loved one";
      const stage = profile.grief_stage;

      let greeting = "";
      if (stage === "anticipating") {
        greeting = `Hi. I know this is a difficult time as you prepare for what's ahead with ${parentName}. I'm here to help you figure out what to ask and what to gather while you still can. Would you like me to walk you through a few things to think about first?`;
      } else {
        greeting = `Hi. I know there is a lot to handle right now after ${parentName}'s death, but you don't have to figure it all out right now. I am here to help you through the process. Would you like me to walk you through a few things to think about first?`;
      }

      const greetingMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: greeting,
        timestamp: new Date(),
        suggestedPrompts: PROMPTS.initial,
        showWalkthrough: true,
      };
      setMessages([greetingMessage]);
      historyRef.current = [{ role: "assistant", content: greeting }];
      setIsReady(true);
    }
  }, [profile, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(false);
    if (menuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [menuOpen]);

  const detectModeSwitch = useCallback((message: string): ChatMode | null => {
    const lowerMessage = message.toLowerCase();
    const therapistTriggers = [
      "i need to talk", "just need someone to listen", "i'm struggling",
      "i'm having a hard", "feeling overwhelmed", "i can't stop crying",
      "i miss them", "i miss him", "i miss her",
      "how am i supposed to feel", "i don't know how to feel",
    ];
    const guideTriggers = [
      "back to practical", "back to tasks", "what should i do",
      "what do i need to", "help me with", "next steps", "ready to look at practical",
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

  const generateSuggestedPrompts = useCallback((content: string, userMessage: string): string[] => {
    const context = detectContext(content, userMessage);
    setConversationContext(context);

    const mentionsTask = content.includes("[task:") ||
      /death certificate|will|probate|bank|insurance|account/i.test(content);

    if (mentionsTask) {
      return ["Walk me through this", "What else should I know?", "What's next after this?"];
    }

    return PROMPTS[context];
  }, [detectContext]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isStreaming) return;

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

      // Parse suggested prompts from the response (if Guide provided them)
      const { prompts: parsedPrompts, remainingContent: contentWithoutPrompts } = parseSuggestedPrompts(fullContent);

      // Use parsed prompts if available, otherwise fall back to generic context-based prompts
      const suggestedPrompts = parsedPrompts.length > 0
        ? parsedPrompts
        : generateSuggestedPrompts(contentWithoutPrompts, messageText);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: contentWithoutPrompts || "I'm sorry, I couldn't generate a response. Please try again.",
        timestamp: new Date(),
        suggestedPrompts,
      };

      setMessages(prev => [...prev, assistantMessage]);
      historyRef.current.push({ role: "assistant", content: contentWithoutPrompts });
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

  const handleStartNewConversation = () => {
    setMenuOpen(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }
    setMode("guide");
    setConversationContext("initial");
    historyRef.current = [];

    const parentName = profile?.deceased_name || "your loved one";
    const stage = profile?.grief_stage;

    let greeting = "";
    if (stage === "anticipating") {
      greeting = `Hi. I know this is a difficult time as you prepare for what's ahead with ${parentName}. I'm here to help you figure out what to ask and what to gather while you still can. Would you like me to walk you through a few things to think about first?`;
    } else {
      greeting = `Hi. I know there is a lot to handle right now after ${parentName}'s death, but you don't have to figure it all out right now. I am here to help you through the process. Would you like me to walk you through a few things to think about first?`;
    }

    const greetingMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: greeting,
      timestamp: new Date(),
      suggestedPrompts: PROMPTS.initial,
      showWalkthrough: true,
    };

    setMessages([greetingMessage]);
    historyRef.current = [{ role: "assistant", content: greeting }];
  };

  const handleWalkthroughResponse = (accepted: boolean) => {
    setMessages(prev => prev.map(m =>
      m.showWalkthrough ? { ...m, showWalkthrough: false } : m
    ));

    if (accepted) {
      const topTasks = tasks
        .filter(t => t.status === "pending")
        .sort((a, b) => (a.priority || 99) - (b.priority || 99))
        .slice(0, 3);

      const taskIds = topTasks.map(t => t.id);
      const taskRefs = taskIds.map(id => `[task:${id}]`).join("\n\n");

      const responseContent = topTasks.length > 0
        ? `Here's what matters most right now:\n\n${taskRefs}`
        : "I'll help you figure out what needs to be done. Let's start by understanding your situation better.";

      const responseMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
        suggestedPrompts: PROMPTS.task,
      };

      setMessages(prev => [...prev, responseMessage]);
      historyRef.current.push({ role: "assistant", content: responseContent });
      setConversationContext("task");
    } else {
      const responseMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "That's okay. I'm here whenever you need me. You can ask me anything, or just let me know when you're ready to look at what needs to be done.",
        timestamp: new Date(),
        suggestedPrompts: PROMPTS.initial,
      };

      setMessages(prev => [...prev, responseMessage]);
      historyRef.current.push({ role: "assistant", content: responseMessage.content });
    }
  };

  // Loading state
  if (userLoading || !isReady) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--primary-100)] flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--primary-500)] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-[var(--foreground-muted)] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile?.onboarding_completed) {
    return null;
  }

  const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");
  const currentPrompts = lastAssistantMessage?.suggestedPrompts || PROMPTS[conversationContext];

  const isTherapistMode = mode === "therapist";

  return (
    <div className={`h-screen h-[100dvh] flex flex-col bg-[var(--background)] ${isTherapistMode ? "therapist-mode" : ""}`}>
      {/* Header */}
      <header className={`bg-white border-b ${isTherapistMode ? "border-[var(--purple-light)]" : "border-[var(--gray-200)]"} px-5 py-3 safe-area-top`}>
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isTherapistMode ? "bg-[var(--purple-light)]" : "bg-[var(--primary-100)]"}`}>
              {isTherapistMode ? (
                <svg className="w-5 h-5 text-[var(--purple-main)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-[var(--primary-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              )}
            </div>
            <div>
              <h1 className="font-semibold text-[var(--foreground)]">Grief Guide</h1>
              <p className="text-xs text-[var(--foreground-muted)]">
                {isTherapistMode ? "Emotional support" : "Here to help"}
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
              className="w-10 h-10 flex items-center justify-center rounded-[var(--radius-lg)] hover:bg-[var(--gray-100)] active:bg-[var(--gray-200)] transition-colors"
              aria-label="Menu"
            >
              <svg className="w-6 h-6 text-[var(--foreground-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-[var(--radius-lg)] shadow-lg border border-[var(--gray-200)] py-2 z-50 animate-fade-in">
                <button
                  onClick={handleHelpRequest}
                  className="menu-item w-full text-left"
                >
                  <svg className="w-5 h-5 text-[var(--foreground-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                  </svg>
                  <span>How to use Grief Guide</span>
                </button>

                <div className="border-t border-[var(--gray-100)] my-2" />

                <Link href="/tasks" className="menu-item">
                  <svg className="w-5 h-5 text-[var(--foreground-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                  <span>View all tasks</span>
                </Link>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleSendMessage("I need help finding professionals - what kind of help is available?");
                  }}
                  className="menu-item w-full text-left"
                >
                  <svg className="w-5 h-5 text-[var(--foreground-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <span>Find professional help</span>
                </button>

                <div className="border-t border-[var(--gray-100)] my-2" />

                <a href="tel:988" className="menu-item hover:bg-[var(--purple-light)]/20">
                  <svg className="w-5 h-5 text-[var(--purple-main)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  <div>
                    <span className="text-[var(--purple-main)] font-medium">Crisis support (988)</span>
                    <p className="text-xs text-[var(--foreground-muted)]">24/7 help available</p>
                  </div>
                </a>

                <div className="border-t border-[var(--gray-100)] my-2" />

                <button onClick={handleStartNewConversation} className="menu-item w-full text-left">
                  <svg className="w-5 h-5 text-[var(--foreground-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  <span>Start new conversation</span>
                </button>

                <Link href="/settings" className="menu-item text-[var(--foreground-muted)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Therapist mode banner */}
      {isTherapistMode && (
        <div className="bg-gradient-to-r from-[var(--purple-light)]/30 to-[var(--purple-light)]/10 border-b border-[var(--purple-light)] px-5 py-2.5">
          <p className="text-sm text-[var(--purple-main)] text-center font-medium">
            Sometimes you just need to talk.
          </p>
        </div>
      )}

      {/* First-time guidance hint */}
      {showFirstTimeHint && (
        <div className="mx-5 mt-4 max-w-3xl md:mx-auto p-4 bg-[var(--primary-50)] border border-[var(--primary-200)] rounded-[var(--radius-lg)] animate-slide-up">
          <p className="text-sm text-[var(--foreground)] leading-relaxed">
            You can ask me about what needs to be done, get help with specific tasks, or just talk when things feel heavy. I'm here for all of it.
          </p>
          <button
            onClick={dismissFirstTimeHint}
            className="mt-3 text-sm font-medium text-[var(--primary-600)] hover:text-[var(--primary-700)] transition-colors"
          >
            Got it
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            mode={mode}
            taskMap={taskMap}
            onTaskStatusChange={handleTaskStatusChange}
            onTellMeMore={handleTellMeMore}
            onSendMessage={handleSendMessage}
            onWalkthroughResponse={handleWalkthroughResponse}
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
          <div className="flex gap-3 animate-fade-in">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isTherapistMode ? "bg-[var(--purple-light)]" : "bg-[var(--primary-100)]"}`}>
              <div className="flex gap-1">
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isTherapistMode ? "bg-[var(--purple-main)]" : "bg-[var(--primary-500)]"}`} />
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isTherapistMode ? "bg-[var(--purple-main)]" : "bg-[var(--primary-500)]"}`} style={{ animationDelay: "0.1s" }} />
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isTherapistMode ? "bg-[var(--purple-main)]" : "bg-[var(--primary-500)]"}`} style={{ animationDelay: "0.2s" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-[var(--gray-200)] bg-white safe-area-bottom">
        {/* Suggested prompts */}
        {!isStreaming && currentPrompts && currentPrompts.length > 0 && (
          <div className="px-5 pt-3 pb-2">
            <div className="max-w-3xl mx-auto flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {currentPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handlePromptClick(prompt)}
                  className={`chip flex-shrink-0 ${
                    isTherapistMode
                      ? "border-[var(--purple-light)] hover:bg-[var(--purple-light)]/20 text-[var(--purple-main)]"
                      : ""
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input form */}
        <div className="px-5 pb-3 pt-2">
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isTherapistMode ? "Share what's on your mind..." : "Ask me anything..."}
                disabled={isStreaming}
                rows={1}
                className={`input resize-none ${
                  isTherapistMode
                    ? "border-[var(--purple-light)] focus:border-[var(--purple-main)] focus:shadow-[0_0_0_3px_var(--purple-light)]"
                    : ""
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={`w-12 h-12 flex items-center justify-center rounded-[var(--radius-lg)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isTherapistMode
                  ? "bg-[var(--purple-main)] hover:bg-[var(--purple-main)]/90 active:bg-[var(--purple-main)]/80"
                  : "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] active:bg-[var(--accent-600)]"
              }`}
              aria-label="Send message"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            </button>
          </form>

          {/* Crisis support link */}
          <div className="text-center pt-2 pb-1">
            <a
              href="tel:988"
              className="text-xs text-[var(--foreground-muted)] hover:text-[var(--purple-main)] transition-colors"
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
  onWalkthroughResponse,
  isStreaming = false,
  isLastMessage = false,
}: {
  message: Message;
  mode: ChatMode;
  taskMap: Map<string, Task>;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  onTellMeMore: (task: Task) => void;
  onSendMessage: (message: string) => void;
  onWalkthroughResponse?: (accepted: boolean) => void;
  isStreaming?: boolean;
  isLastMessage?: boolean;
}) {
  const isUser = message.role === "user";
  const isTherapistMode = mode === "therapist";

  // User messages
  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className={`chat-bubble chat-bubble-user ${isTherapistMode ? "!bg-[var(--purple-main)]" : "!bg-[var(--primary-500)]"}`}>
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // Assistant messages
  // First check for funeral home search
  const { hasSearch: hasFuneralHomeSearch, zipCode: funeralHomeZip, remainingContent: contentAfterSearch } = parseFuneralHomeSearch(message.content);

  // Check for input requests
  const { hasInput, inputType, label: inputLabel, remainingContent: contentAfterInput } = parseInputRequest(contentAfterSearch);

  // Parse task flow components (phone, call-script, checklist)
  const taskFlowContent = parseTaskFlowContent(contentAfterInput);

  // Then parse the remaining content for tasks and actions (from text segments only)
  const textContent = taskFlowContent.segments
    .filter(s => s.type === "text")
    .map(s => s.content)
    .join("\n");
  const { segments, taskIds, actions: explicitActions } = parseMessageContent(textContent);

  // Use explicit actions from message if present, otherwise generate contextual actions
  // Don't show contextual actions if there's an input request (the input IS the action)
  const effectiveActions = isLastMessage && !isStreaming && !hasInput
    ? (explicitActions.length > 0 ? explicitActions : generateContextualActions(textContent, taskIds[0]))
    : [];

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
    <div className="flex gap-3 animate-slide-up">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isTherapistMode ? "bg-[var(--purple-light)]" : "bg-[var(--primary-100)]"
      }`}>
        {isTherapistMode ? (
          <svg className="w-4 h-4 text-[var(--purple-main)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-[var(--primary-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        )}
      </div>

      {/* Message content */}
      <div className="max-w-[85%] space-y-3">
        {segments.map((segment, index) => {
          if (segment.type === "text") {
            const isLastSegment = index === segments.length - 1;
            return (
              <div key={index} className="chat-bubble chat-bubble-assistant">
                <div className="whitespace-pre-wrap break-words text-[var(--foreground)]">
                  {segment.content}
                  {isStreaming && isLastSegment && (
                    <span className={`inline-block w-0.5 h-5 ml-0.5 rounded-full animate-pulse ${isTherapistMode ? "bg-[var(--purple-main)]" : "bg-[var(--primary-500)]"}`} />
                  )}
                </div>

                {/* Walkthrough buttons */}
                {isLastSegment && message.showWalkthrough && onWalkthroughResponse && (
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <button
                      onClick={() => onWalkthroughResponse(true)}
                      className="action-btn action-btn-primary flex-1 min-w-[140px]"
                    >
                      Yes, walk me through it
                    </button>
                    <button
                      onClick={() => onWalkthroughResponse(false)}
                      className="action-btn flex-1 min-w-[100px]"
                    >
                      Not right now
                    </button>
                  </div>
                )}

                {/* Action buttons - show explicit actions from Guide or contextual actions */}
                {isLastSegment && isLastMessage && !isStreaming && !message.showWalkthrough && effectiveActions.length > 0 && (
                  <MessageActions
                    actions={effectiveActions}
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
              return (
                <div key={index} className="task-card">
                  <div className="task-card-header">
                    <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                      </svg>
                      <span className="text-sm font-medium">Task: {segment.taskId}</span>
                    </div>
                  </div>
                  <div className="task-card-actions">
                    <button
                      onClick={() => onSendMessage(`Tell me more about "${segment.taskId}"`)}
                      className="action-btn action-btn-primary flex-1"
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

        {/* Task Flow Components (phone buttons, call scripts, checklists) */}
        {taskFlowContent.segments.map((segment, index) => {
          if (segment.type === "phone" && segment.phoneNumber && segment.phoneLabel) {
            return (
              <div key={`flow-${index}`} className="my-2">
                <PhoneButton number={segment.phoneNumber} label={segment.phoneLabel} />
              </div>
            );
          }
          if (segment.type === "call-script" && segment.scriptType) {
            return (
              <CallScriptCard key={`flow-${index}`} type={segment.scriptType} />
            );
          }
          if (segment.type === "checklist" && segment.checklistType) {
            return (
              <InteractiveChecklist key={`flow-${index}`} type={segment.checklistType} />
            );
          }
          return null;
        })}

        {/* Funeral Home Search Results */}
        {hasFuneralHomeSearch && funeralHomeZip && (
          <FuneralHomeSearch zipCode={funeralHomeZip} onSendMessage={onSendMessage} />
        )}

        {/* Input Request */}
        {hasInput && inputType && isLastMessage && !isStreaming && (
          <ChatInput
            type={inputType}
            label={inputLabel || undefined}
            onSubmit={(value) => onSendMessage(value)}
          />
        )}
      </div>
    </div>
  );
}
