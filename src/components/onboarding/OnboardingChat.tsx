"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import type { GriefStage, KnowledgeStatus } from "@/lib/supabase/types";

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

// Test account: Chris lost parent Terry, surviving parent is Gloria
const TEST_ACCOUNT_BASE = {
  full_name: "Chris",
  user_role: "family_helper" as const,
  state: "California",
  deceased_name: "Terry",
  deceased_had_spouse: true,
  has_surviving_parent: true,
  number_of_siblings: 1,
  check_in_frequency: "weekly" as const,
  onboarding_completed: true,
};

const GRIEF_STAGES = {
  immediate: "immediate" as const,
  anticipating: "anticipating" as const,
  navigating: "navigating" as const,
};

const KNOWLEDGE_PRESETS = {
  nothing: {
    knows_will_status: "unknown" as const,
    knows_trust_status: "unknown" as const,
    knows_property_status: "unknown" as const,
    knows_accounts_status: "unknown" as const,
    knows_insurance_status: "unknown" as const,
  },
  some: {
    knows_will_status: "yes" as const,
    knows_trust_status: "unknown" as const,
    knows_property_status: "yes" as const,
    knows_accounts_status: "unknown" as const,
    knows_insurance_status: "unknown" as const,
  },
  all: {
    knows_will_status: "yes" as const,
    knows_trust_status: "yes" as const,
    knows_property_status: "yes" as const,
    knows_accounts_status: "yes" as const,
    knows_insurance_status: "yes" as const,
  },
};

const TEST_SCENARIOS = [
  { value: "immediate_nothing", label: "Immediate + Nothing", stage: "immediate", knowledge: "nothing" },
  { value: "immediate_some", label: "Immediate + Some", stage: "immediate", knowledge: "some" },
  { value: "immediate_all", label: "Immediate + All", stage: "immediate", knowledge: "all" },
  { value: "anticipating_nothing", label: "Anticipating + Nothing", stage: "anticipating", knowledge: "nothing" },
  { value: "anticipating_some", label: "Anticipating + Some", stage: "anticipating", knowledge: "some" },
  { value: "anticipating_all", label: "Anticipating + All", stage: "anticipating", knowledge: "all" },
  { value: "navigating_nothing", label: "Navigating + Nothing", stage: "navigating", knowledge: "nothing" },
  { value: "navigating_some", label: "Navigating + Some", stage: "navigating", knowledge: "some" },
  { value: "navigating_all", label: "Navigating + All", stage: "navigating", knowledge: "all" },
] as const;

type Step = "welcome" | "stage" | "parent" | "knowledge" | "complete";

export function OnboardingChat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateProfile } = useUser();

  const [step, setStep] = useState<Step>("welcome");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);

  // Form data
  const [griefStage, setGriefStage] = useState<GriefStage | null>(null);
  const [parentName, setParentName] = useState("");
  const [state, setState] = useState("");
  const [knowledgeLevel, setKnowledgeLevel] = useState<"full" | "partial" | "none" | null>(null);

  // Check for dev mode via URL param
  useEffect(() => {
    if (searchParams.get("dev") === "true") {
      setShowDevTools(true);
    }
  }, [searchParams]);

  const handleTestAccount = async (scenarioValue: string) => {
    setIsSubmitting(true);
    try {
      const scenario = TEST_SCENARIOS.find(s => s.value === scenarioValue);
      if (!scenario) throw new Error("Unknown test scenario");

      const testData = {
        ...TEST_ACCOUNT_BASE,
        grief_stage: GRIEF_STAGES[scenario.stage as keyof typeof GRIEF_STAGES],
        ...KNOWLEDGE_PRESETS[scenario.knowledge as keyof typeof KNOWLEDGE_PRESETS],
      };
      await updateProfile(testData);
      router.push("/chat");
    } catch (err) {
      console.error("Test account error:", err);
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!griefStage || !parentName || !state || !knowledgeLevel) return;

    setIsSubmitting(true);
    try {
      let knowsWill: KnowledgeStatus = "unknown";
      let knowsTrust: KnowledgeStatus = "unknown";
      let knowsProperty: KnowledgeStatus = "unknown";
      let knowsAccounts: KnowledgeStatus = "unknown";
      let knowsInsurance: KnowledgeStatus = "unknown";

      if (knowledgeLevel === "full") {
        knowsWill = "yes";
        knowsTrust = "yes";
        knowsProperty = "yes";
        knowsAccounts = "yes";
        knowsInsurance = "yes";
      }

      await updateProfile({
        grief_stage: griefStage,
        user_role: "executor",
        state: state,
        deceased_name: parentName,
        deceased_had_spouse: false,
        knows_will_status: knowsWill,
        knows_trust_status: knowsTrust,
        knows_property_status: knowsProperty,
        knows_accounts_status: knowsAccounts,
        knows_insurance_status: knowsInsurance,
        has_surviving_parent: false,
        number_of_siblings: 0,
        check_in_frequency: "weekly",
        onboarding_completed: true,
      });

      router.push("/chat");
    } catch (err) {
      console.error("Onboarding error:", err);
      setIsSubmitting(false);
    }
  };

  const getCompletionMessage = () => {
    const name = parentName || "your parent";
    if (griefStage === "anticipating") {
      return `We'll help you prepare for what's ahead with ${name}—at your own pace, no pressure.`;
    } else if (griefStage === "immediate") {
      return `There's a lot happening right now. We'll help you focus on what actually matters this week.`;
    } else {
      return `Even when time has passed, there's often still things to sort through. We'll help you work through it.`;
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--background)] flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-[var(--gray-200)]">
        <div
          className="h-full bg-[var(--primary-500)] transition-all duration-300"
          style={{
            width: step === "welcome" ? "20%" :
                   step === "stage" ? "40%" :
                   step === "parent" ? "60%" :
                   step === "knowledge" ? "80%" : "100%"
          }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-md">

          {/* Step 1: Welcome */}
          {step === "welcome" && (
            <div className="bg-white rounded-2xl shadow-sm border border-[var(--gray-200)] p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[var(--primary-100)] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-[var(--primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-semibold text-[var(--gray-900)] mb-4">
                  We're here to help
                </h1>
                <p className="text-[var(--gray-600)] leading-relaxed">
                  Losing a parent is one of life's hardest experiences. On top of the grief, there's an overwhelming amount to manage—legal documents, accounts, notifications, and countless decisions.
                </p>
                <p className="text-[var(--gray-600)] leading-relaxed mt-4">
                  Grief Guide helps you navigate these practical matters step by step. We'll be here whenever you need guidance.
                </p>
              </div>

              <button
                onClick={() => setStep("stage")}
                className="w-full py-3 px-4 bg-[var(--accent-500)] text-white rounded-xl font-medium hover:bg-[var(--accent-600)] transition-colors min-h-[52px]"
              >
                Continue
              </button>

              {/* Dev Tools */}
              {showDevTools && (
                <div className="mt-8 pt-6 border-t border-[var(--gray-200)]">
                  <button
                    onClick={() => setShowDevTools(!showDevTools)}
                    className="text-xs text-[var(--gray-400)] mb-3 hover:text-[var(--gray-600)]"
                  >
                    Dev Tools
                  </button>
                  <div className="grid grid-cols-3 gap-2">
                    {TEST_SCENARIOS.map((scenario) => (
                      <button
                        key={scenario.value}
                        onClick={() => handleTestAccount(scenario.value)}
                        disabled={isSubmitting}
                        className="px-2 py-1.5 text-xs bg-[var(--gray-100)] text-[var(--gray-600)] rounded hover:bg-[var(--gray-200)] disabled:opacity-50 transition-colors"
                      >
                        {scenario.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Grief Stage */}
          {step === "stage" && (
            <div className="bg-white rounded-2xl shadow-sm border border-[var(--gray-200)] p-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-semibold text-[var(--gray-900)] mb-2">
                  Where are you in this journey?
                </h1>
              </div>

              <div className="space-y-3 mb-8">
                <button
                  onClick={() => setGriefStage("anticipating")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    griefStage === "anticipating"
                      ? "border-[var(--primary-500)] bg-[var(--primary-50)]"
                      : "border-[var(--gray-200)] hover:border-[var(--gray-300)]"
                  }`}
                >
                  <div className="font-medium text-[var(--gray-900)]">My parent is sick or in hospice</div>
                  <div className="text-sm text-[var(--gray-500)] mt-1">Preparing for what's ahead</div>
                </button>

                <button
                  onClick={() => setGriefStage("immediate")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    griefStage === "immediate"
                      ? "border-[var(--primary-500)] bg-[var(--primary-50)]"
                      : "border-[var(--gray-200)] hover:border-[var(--gray-300)]"
                  }`}
                >
                  <div className="font-medium text-[var(--gray-900)]">My parent recently passed</div>
                  <div className="text-sm text-[var(--gray-500)] mt-1">In the first days or weeks</div>
                </button>

                <button
                  onClick={() => setGriefStage("navigating")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    griefStage === "navigating"
                      ? "border-[var(--primary-500)] bg-[var(--primary-50)]"
                      : "border-[var(--gray-200)] hover:border-[var(--gray-300)]"
                  }`}
                >
                  <div className="font-medium text-[var(--gray-900)]">My parent passed a while ago</div>
                  <div className="text-sm text-[var(--gray-500)] mt-1">Still working through things</div>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("welcome")}
                  className="px-4 py-3 text-[var(--gray-600)] hover:text-[var(--gray-900)] transition-colors min-h-[52px]"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("parent")}
                  disabled={!griefStage}
                  className="flex-1 py-3 px-4 bg-[var(--accent-500)] text-white rounded-xl font-medium hover:bg-[var(--accent-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[52px]"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Parent Info */}
          {step === "parent" && (
            <div className="bg-white rounded-2xl shadow-sm border border-[var(--gray-200)] p-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-semibold text-[var(--gray-900)] mb-2">
                  Tell us about your parent
                </h1>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                    Their name
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="First name is fine"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                    What state are you in?
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="input"
                  >
                    <option value="">Select a state...</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--gray-500)] mt-2">Laws vary by state, so this helps us give better guidance.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("stage")}
                  className="px-4 py-3 text-[var(--gray-600)] hover:text-[var(--gray-900)] transition-colors min-h-[52px]"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("knowledge")}
                  disabled={!parentName.trim() || !state}
                  className="flex-1 py-3 px-4 bg-[var(--accent-500)] text-white rounded-xl font-medium hover:bg-[var(--accent-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[52px]"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Knowledge Level */}
          {step === "knowledge" && (
            <div className="bg-white rounded-2xl shadow-sm border border-[var(--gray-200)] p-8">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-semibold text-[var(--gray-900)] mb-2">
                  What do you know about their affairs?
                </h1>
                <p className="text-[var(--gray-500)]">
                  It's okay if you don't know much—most people don't. We'll help you figure it out.
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <button
                  onClick={() => setKnowledgeLevel("full")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    knowledgeLevel === "full"
                      ? "border-[var(--primary-500)] bg-[var(--primary-50)]"
                      : "border-[var(--gray-200)] hover:border-[var(--gray-300)]"
                  }`}
                >
                  <div className="font-medium text-[var(--gray-900)]">I have a good picture</div>
                  <div className="text-sm text-[var(--gray-500)] mt-1">I know about their finances and legal documents</div>
                </button>

                <button
                  onClick={() => setKnowledgeLevel("partial")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    knowledgeLevel === "partial"
                      ? "border-[var(--primary-500)] bg-[var(--primary-50)]"
                      : "border-[var(--gray-200)] hover:border-[var(--gray-300)]"
                  }`}
                >
                  <div className="font-medium text-[var(--gray-900)]">I know some things</div>
                  <div className="text-sm text-[var(--gray-500)] mt-1">But not everything</div>
                </button>

                <button
                  onClick={() => setKnowledgeLevel("none")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    knowledgeLevel === "none"
                      ? "border-[var(--primary-500)] bg-[var(--primary-50)]"
                      : "border-[var(--gray-200)] hover:border-[var(--gray-300)]"
                  }`}
                >
                  <div className="font-medium text-[var(--gray-900)]">Honestly, I have no idea</div>
                  <div className="text-sm text-[var(--gray-500)] mt-1">That's completely okay</div>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("parent")}
                  className="px-4 py-3 text-[var(--gray-600)] hover:text-[var(--gray-900)] transition-colors min-h-[52px]"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("complete")}
                  disabled={!knowledgeLevel}
                  className="flex-1 py-3 px-4 bg-[var(--accent-500)] text-white rounded-xl font-medium hover:bg-[var(--accent-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[52px]"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === "complete" && (
            <div className="bg-white rounded-2xl shadow-sm border border-[var(--gray-200)] p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[var(--primary-100)] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-[var(--primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-semibold text-[var(--gray-900)] mb-4">
                  You're all set
                </h1>
                <p className="text-[var(--gray-600)] leading-relaxed">
                  {getCompletionMessage()}
                </p>
                {(knowledgeLevel === "none" || knowledgeLevel === "partial") && (
                  <p className="text-[var(--gray-600)] leading-relaxed mt-4">
                    Don't worry about not knowing everything—we'll figure it out together.
                  </p>
                )}
              </div>

              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-[var(--accent-500)] text-white rounded-xl font-medium hover:bg-[var(--accent-600)] disabled:opacity-50 transition-colors min-h-[52px]"
              >
                {isSubmitting ? "Getting started..." : "Get Started"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
