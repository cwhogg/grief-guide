"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  type: "zipcode" | "phone" | "text";
  placeholder?: string;
  onSubmit: (value: string) => void;
  label?: string;
}

export function ChatInput({ type, placeholder, onSubmit, label }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const getInputProps = () => {
    switch (type) {
      case "zipcode":
        return {
          inputMode: "numeric" as const,
          pattern: "[0-9]*",
          maxLength: 5,
          placeholder: placeholder || "Enter zip code",
        };
      case "phone":
        return {
          inputMode: "tel" as const,
          pattern: "[0-9-()+ ]*",
          maxLength: 20,
          placeholder: placeholder || "Enter phone number",
        };
      default:
        return {
          inputMode: "text" as const,
          placeholder: placeholder || "Enter value",
        };
    }
  };

  const validate = (val: string): boolean => {
    switch (type) {
      case "zipcode":
        if (!/^\d{5}$/.test(val)) {
          setError("Please enter a 5-digit zip code");
          return false;
        }
        break;
      case "phone":
        if (!/^[\d-()+ ]{10,}$/.test(val)) {
          setError("Please enter a valid phone number");
          return false;
        }
        break;
    }
    setError(null);
    return true;
  };

  const handleSubmit = () => {
    if (validate(value)) {
      onSubmit(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const inputProps = getInputProps();

  return (
    <div className="my-3 p-4 bg-white border border-[var(--primary-200)] rounded-[var(--radius-lg)] shadow-sm">
      {label && (
        <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          className={`flex-1 px-4 py-3 text-lg border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent ${
            error ? "border-red-300 bg-red-50" : "border-[var(--gray-300)]"
          }`}
          {...inputProps}
        />
        <button
          onClick={handleSubmit}
          disabled={!value}
          className="px-6 py-3 bg-[var(--primary-500)] text-white font-medium rounded-[var(--radius-md)] hover:bg-[var(--primary-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// Parser to extract input requests from message content
export function parseInputRequest(content: string): {
  hasInput: boolean;
  inputType: "zipcode" | "phone" | "text" | null;
  label: string | null;
  remainingContent: string;
} {
  // Format: [input:type|label]
  const pattern = /\[input:(zipcode|phone|text)(?:\|([^\]]+))?\]/;
  const match = content.match(pattern);

  if (match) {
    return {
      hasInput: true,
      inputType: match[1] as "zipcode" | "phone" | "text",
      label: match[2] || null,
      remainingContent: content.replace(pattern, "").trim(),
    };
  }

  return {
    hasInput: false,
    inputType: null,
    label: null,
    remainingContent: content,
  };
}
