"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import type { OnboardingData, GriefStage, KnowledgeStatus } from "@/lib/supabase/types";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "District of Columbia",
];

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  inputType?: "button" | "text" | "dropdown" | "none";
  options?: Array<{ value: string; label: string }>;
  field?: string;
}

type ConversationStep =
  | "welcome"
  | "stage"
  | "name"
  | "state"
  | "role"
  | "knowledge"
  | "complete";

// Test account data for Terry
const TEST_ACCOUNT_DATA = {
  full_name: "Terry",
  grief_stage: "immediate" as const,
  user_role: "executor" as const,
  state: "California",
  deceased_name: "Margaret",
  deceased_had_spouse: false,
  knows_will_status: "unknown" as const,
  knows_trust_status: "unknown" as const,
  knows_property_status: "yes" as const,
  knows_accounts_status: "unknown" as const,
  knows_insurance_status: "unknown" as const,
  has_surviving_parent: false,
  number_of_siblings: 1,
  check_in_frequency: "weekly" as const,
  onboarding_completed: true,
};

export function OnboardingChat() {
  const router = useRouter();
  const { updateProfile } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState<ConversationStep>("welcome");
  const [isTyping, setIsTyping] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle test account login
  const handleTestAccount = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile(TEST_ACCOUNT_DATA);
      router.push("/chat");
    } catch (err) {
      console.error("Test account error:", err);
      setIsSubmitting(false);
    }
  };

  const [data, setData] = useState<OnboardingData>({
    griefStage: "immediate",
    userRole: "executor",
    state: "",
    deceasedName: "",
    deceasedHadSpouse: false,
    knowsLegalFinancialSituation: "none",
    knowsWillStatus: "unknown",
    knowsTrustStatus: "unknown",
    knowsPropertyStatus: "unknown",
    knowsAccountsStatus: "unknown",
    knowsInsuranceStatus: "unknown",
    hasSurvivingParent: false,
    numberOfSiblings: 0,
    checkInFrequency: "weekly",
  });

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Start conversation
  useEffect(() => {
    if (messages.length === 0) {
      addAssistantMessage({
        content: "Hey. Whether you're preparing for what's ahead or already in the thick of it, I'm here to help you figure out what needs to happen—and to be someone you can talk to when it gets heavy.\n\nCan I ask you a few quick questions?",
        inputType: "button",
        options: [
          { value: "yes", label: "Yeah, let's do this" },
          { value: "test", label: "Use test account (Terry)" },
        ],
        field: "welcome",
      });
    }
  }, [messages.length]);

  const addAssistantMessage = (msg: Omit<Message, "id" | "role">) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { ...msg, id: crypto.randomUUID(), role: "assistant" },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const addUserMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content },
    ]);
  };

  const handleButtonClick = async (value: string, label: string) => {
    // Handle test account specially - don't add as user message
    if (value === "test") {
      handleTestAccount();
      return;
    }

    addUserMessage(label);

    // Process based on current step
    switch (currentStep) {
      case "welcome":
        setCurrentStep("stage");
        setTimeout(() => {
          addAssistantMessage({
            content: "Where are you in this right now?",
            inputType: "button",
            options: [
              { value: "anticipating", label: "My parent is sick or in hospice" },
              { value: "immediate", label: "My parent just passed" },
              { value: "navigating", label: "My parent passed a while ago" },
            ],
            field: "stage",
          });
        }, 300);
        break;

      case "stage":
        setData((prev) => ({ ...prev, griefStage: value as GriefStage }));
        setCurrentStep("name");
        setTimeout(() => {
          addAssistantMessage({
            content: "What's your parent's first name?",
            inputType: "text",
            field: "name",
          });
        }, 300);
        break;

      case "role":
        const roleMap: Record<string, string> = {
          main: "executor",
          helping: "family_helper",
          unsure: "other",
        };
        setData((prev) => ({ ...prev, userRole: roleMap[value] as OnboardingData["userRole"] }));
        setCurrentStep("knowledge");
        setTimeout(() => {
          const parentName = data.deceasedName || "your parent";
          addAssistantMessage({
            content: `Do you know much about ${parentName}'s legal and financial situation—like whether they have a will, own property, or have retirement accounts?`,
            inputType: "button",
            options: [
              { value: "full", label: "Yes, I have a pretty good picture" },
              { value: "partial", label: "I know some things but not everything" },
              { value: "none", label: "Honestly, I have no idea" },
            ],
            field: "knowledge",
          });
        }, 300);
        break;

      case "knowledge":
        handleKnowledgeSelection(value as "full" | "partial" | "none");
        break;
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;

    const value = textInput.trim();
    addUserMessage(value);
    setTextInput("");

    if (currentStep === "name") {
      setData((prev) => ({ ...prev, deceasedName: value }));
      setCurrentStep("state");
      setTimeout(() => {
        addAssistantMessage({
          content: "And what state are you in? Laws are different everywhere.",
          inputType: "dropdown",
          options: US_STATES.map((s) => ({ value: s, label: s })),
          field: "state",
        });
      }, 300);
    }
  };

  const handleDropdownSelect = (value: string) => {
    addUserMessage(value);

    if (currentStep === "state") {
      setData((prev) => ({ ...prev, state: value }));
      setCurrentStep("role");
      setTimeout(() => {
        addAssistantMessage({
          content: "Are you the one handling most of this, or helping someone else?",
          inputType: "button",
          options: [
            { value: "main", label: "I'm the main person handling things" },
            { value: "helping", label: "I'm helping family" },
            { value: "unsure", label: "Not sure yet" },
          ],
          field: "role",
        });
      }, 300);
    }
  };

  const handleKnowledgeSelection = async (level: "full" | "partial" | "none") => {
    let knowsWill: KnowledgeStatus = "unknown";
    let knowsTrust: KnowledgeStatus = "unknown";
    let knowsProperty: KnowledgeStatus = "unknown";
    let knowsAccounts: KnowledgeStatus = "unknown";
    let knowsInsurance: KnowledgeStatus = "unknown";

    if (level === "full") {
      knowsWill = "yes";
      knowsTrust = "yes";
      knowsProperty = "yes";
      knowsAccounts = "yes";
      knowsInsurance = "yes";
    }
    // For "partial" and "none", keep as "unknown" - user will discover

    const updatedData = {
      ...data,
      knowsLegalFinancialSituation: level,
      knowsWillStatus: knowsWill,
      knowsTrustStatus: knowsTrust,
      knowsPropertyStatus: knowsProperty,
      knowsAccountsStatus: knowsAccounts,
      knowsInsuranceStatus: knowsInsurance,
    };

    setData(updatedData);
    setCurrentStep("complete");

    // Show closing message
    setTimeout(() => {
      const parentName = updatedData.deceasedName || "your parent";
      let closingMessage = "";

      if (updatedData.griefStage === "anticipating") {
        closingMessage = `Got it. I'll help you figure out what conversations to have and what to gather while you still can—no pressure, at your own pace.`;
      } else if (updatedData.griefStage === "immediate") {
        closingMessage = `Got it. There's a lot happening right now. I'll help you focus on what actually matters this week.`;
      } else {
        closingMessage = `Got it. Even when time has passed, there's often still stuff to sort through. I'll help you work through it.`;
      }

      if (level === "none" || level === "partial") {
        closingMessage += `\n\nAnd don't worry about not knowing the legal and financial stuff—most people don't. We'll figure it out together.`;
      }

      addAssistantMessage({
        content: closingMessage,
        inputType: "button",
        options: [{ value: "start", label: "Let's go" }],
        field: "complete",
      });
    }, 300);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    try {
      await updateProfile({
        grief_stage: data.griefStage,
        user_role: data.userRole,
        state: data.state,
        deceased_name: data.deceasedName,
        deceased_had_spouse: data.deceasedHadSpouse,
        knows_will_status: data.knowsWillStatus,
        knows_trust_status: data.knowsTrustStatus,
        knows_property_status: data.knowsPropertyStatus,
        knows_accounts_status: data.knowsAccountsStatus,
        knows_insurance_status: data.knowsInsuranceStatus,
        has_surviving_parent: data.hasSurvivingParent,
        number_of_siblings: data.numberOfSiblings,
        check_in_frequency: data.checkInFrequency,
        onboarding_completed: true,
      });

      router.push("/chat");
    } catch (err) {
      console.error("Onboarding error:", err);
      setIsSubmitting(false);
    }
  };

  const handleButtonAction = (value: string, label: string) => {
    if (currentStep === "complete" && value === "start") {
      handleComplete();
    } else {
      handleButtonClick(value, label);
    }
  };

  // Get the last message to show input
  const lastMessage = messages[messages.length - 1];
  const showInput = lastMessage?.role === "assistant" && lastMessage?.inputType !== "none" && !isTyping;

  return (
    <div className="h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h1 className="font-semibold text-stone-900">Grief Guide</h1>
            <p className="text-xs text-stone-500">Here to help</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {showInput && (
        <div className="border-t border-stone-200 bg-white p-4">
          {lastMessage.inputType === "button" && lastMessage.options && (
            <div className="flex flex-wrap gap-2 justify-center">
              {lastMessage.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleButtonAction(option.value, option.label)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {isSubmitting && option.value === "start" ? "Starting..." : option.label}
                </button>
              ))}
            </div>
          )}

          {lastMessage.inputType === "text" && (
            <form onSubmit={(e) => { e.preventDefault(); handleTextSubmit(); }} className="flex gap-3">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type their name..."
                autoFocus
                className="flex-1 px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-600 focus:border-amber-600"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="px-4 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          )}

          {lastMessage.inputType === "dropdown" && lastMessage.options && (
            <div className="max-w-xs mx-auto">
              <select
                onChange={(e) => handleDropdownSelect(e.target.value)}
                defaultValue=""
                className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-600 focus:border-amber-600 bg-white text-stone-900"
              >
                <option value="" disabled>Select your state...</option>
                {lastMessage.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-stone-200" : "bg-amber-100"
        }`}
      >
        {isUser ? (
          <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
            ? "bg-amber-600 text-white rounded-tr-sm"
            : "bg-white shadow-sm border border-stone-200 rounded-tl-sm"
        }`}
      >
        <div className={`whitespace-pre-wrap break-words ${isUser ? "text-white" : "text-stone-700"}`}>
          {message.content}
        </div>
      </div>
    </div>
  );
}
