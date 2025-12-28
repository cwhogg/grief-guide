"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  initialMessages?: Message[];
  initialGreeting?: string;
  onSendMessage: (message: string) => Promise<ReadableStream<Uint8Array> | null>;
  onMessagesChange?: (messages: Message[]) => void;
  placeholder?: string;
  agentName?: string;
  agentDescription?: string;
}

export function ChatInterface({
  initialMessages = [],
  initialGreeting,
  onSendMessage,
  onMessagesChange,
  placeholder = "Type your message...",
  agentName = "Guide",
  agentDescription = "Here to help you navigate what comes next",
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasGreeted = useRef(false);

  // Add initial greeting
  useEffect(() => {
    if (initialGreeting && !hasGreeted.current && messages.length === 0) {
      hasGreeted.current = true;
      const greetingMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: initialGreeting,
        timestamp: new Date(),
      };
      setMessages([greetingMessage]);
      onMessagesChange?.([greetingMessage]);
    }
  }, [initialGreeting, messages.length, onMessagesChange]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const trimmedInput = input.trim();
      if (!trimmedInput || isStreaming) return;

      // Add user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmedInput,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setIsStreaming(true);
      setStreamingContent("");

      try {
        const stream = await onSendMessage(trimmedInput);

        if (!stream) {
          throw new Error("No response stream");
        }

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // Parse SSE format
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
                // Not valid JSON, might be partial chunk
                // Try to extract content directly if it looks like text
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

        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);
        onMessagesChange?.(finalMessages);
      } catch (error) {
        console.error("Chat error:", error);
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "I'm sorry, something went wrong. Please try again in a moment.",
          timestamp: new Date(),
        };
        const finalMessages = [...updatedMessages, errorMessage];
        setMessages(finalMessages);
        onMessagesChange?.(finalMessages);
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    [input, isStreaming, messages, onSendMessage, onMessagesChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-200)] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--primary-100)] flex items-center justify-center">
            <svg
              className="w-5 h-5 text-[var(--primary-600)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-[var(--gray-900)]">{agentName}</h2>
            <p className="text-sm text-[var(--gray-500)]">{agentDescription}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
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
            isStreaming
          />
        )}

        {/* Typing indicator */}
        {isStreaming && !streamingContent && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--primary-100)] flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 text-[var(--primary-600)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-[var(--gray-200)]">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[var(--gray-400)] rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-[var(--gray-400)] rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 bg-[var(--gray-400)] rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--gray-200)] bg-white p-4 safe-area-bottom">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isStreaming}
              rows={1}
              className="w-full px-4 py-3 border border-[var(--gray-300)] rounded-[var(--radius-lg)] resize-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-[var(--primary-500)] disabled:opacity-50 disabled:bg-[var(--gray-50)]"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="px-4 py-3 bg-[var(--primary-600)] text-white rounded-[var(--radius-lg)] hover:bg-[var(--primary-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[48px]"
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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
        <p className="text-xs text-[var(--gray-400)] mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: Message;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-[var(--gray-200)]" : "bg-[var(--primary-100)]"
        }`}
      >
        {isUser ? (
          <svg
            className="w-4 h-4 text-[var(--gray-600)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-[var(--primary-600)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </div>

      {/* Message bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-[var(--primary-600)] text-white rounded-tr-sm"
            : "bg-white shadow-sm border border-[var(--gray-200)] rounded-tl-sm"
        }`}
      >
        <div
          className={`whitespace-pre-wrap break-words ${
            isUser ? "text-white" : "text-[var(--gray-700)]"
          }`}
        >
          {message.content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-[var(--primary-600)] animate-pulse" />
          )}
        </div>
        <div
          className={`text-xs mt-1 ${
            isUser ? "text-[var(--primary-200)]" : "text-[var(--gray-400)]"
          }`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}

// Quick action suggestions component
export function QuickActions({
  actions,
  onSelect,
  disabled,
}: {
  actions: string[];
  onSelect: (action: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 p-4 border-t border-[var(--gray-100)] bg-[var(--background)]">
      <span className="text-xs text-[var(--gray-500)] w-full mb-1">
        Suggested questions:
      </span>
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => onSelect(action)}
          disabled={disabled}
          className="px-3 py-1.5 text-sm bg-white border border-[var(--gray-200)] rounded-full hover:bg-[var(--gray-50)] hover:border-[var(--gray-300)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[36px]"
        >
          {action}
        </button>
      ))}
    </div>
  );
}
