"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OnboardingData, UserRole, CheckInFrequency } from "@/lib/supabase/types";

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
  "West Virginia", "Wisconsin", "Wyoming", "District of Columbia"
];

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  {
    value: "executor",
    label: "I'm the executor",
    description: "You're legally responsible for managing the estate",
  },
  {
    value: "co_executor",
    label: "I'm a co-executor",
    description: "You share executor responsibilities with someone else",
  },
  {
    value: "spouse",
    label: "I'm the surviving spouse",
    description: "You were married to the deceased",
  },
  {
    value: "only_child",
    label: "I'm the only child",
    description: "You're handling everything as the sole surviving child",
  },
  {
    value: "family_helper",
    label: "I'm helping my family",
    description: "You're supporting others who are managing the estate",
  },
  {
    value: "other",
    label: "Other",
    description: "Your situation is different",
  },
];

const FREQUENCY_OPTIONS: { value: CheckInFrequency; label: string; description: string }[] = [
  {
    value: "daily",
    label: "Daily",
    description: "A gentle reminder each day",
  },
  {
    value: "weekly",
    label: "Weekly",
    description: "A summary once a week",
  },
  {
    value: "as_needed",
    label: "Only when I ask",
    description: "No scheduled check-ins",
  },
];

const initialData: OnboardingData = {
  userRole: "executor",
  state: "",
  deceasedName: "",
  deceasedHadSpouse: false,
  deceasedHadWill: false,
  deceasedHadTrust: false,
  deceasedOwnedProperty: false,
  deceasedHadRetirementAccounts: false,
  hasSurvivingParent: false,
  numberOfSiblings: 0,
  checkInFrequency: "weekly",
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 6;

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save onboarding data");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return !!data.userRole;
      case 3:
        return !!data.state;
      case 4:
        return !!data.deceasedName.trim();
      case 5:
        return true;
      case 6:
        return !!data.checkInFrequency;
      default:
        return false;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-stone-100">
        <div
          className="h-full bg-amber-600 transition-all duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      <div className="p-6 sm:p-8">
        {/* Step indicator */}
        <div className="text-sm text-stone-500 mb-6">
          Step {step} of {totalSteps}
        </div>

        {/* Step content */}
        <div className="min-h-[320px]">
          {step === 1 && <StepWelcome />}
          {step === 2 && <StepRole data={data} updateData={updateData} />}
          {step === 3 && <StepLocation data={data} updateData={updateData} />}
          {step === 4 && <StepDeceased data={data} updateData={updateData} />}
          {step === 5 && <StepFamily data={data} updateData={updateData} />}
          {step === 6 && <StepPreferences data={data} updateData={updateData} />}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-stone-100">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="px-4 py-2 text-stone-600 hover:text-stone-900 disabled:opacity-0 disabled:cursor-default transition-opacity"
          >
            Back
          </button>

          {step < totalSteps ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed()}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Setting up..." : "Get Started"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepWelcome() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-stone-900">
        We&apos;re here to help
      </h1>
      <div className="space-y-4 text-stone-600 leading-relaxed">
        <p>
          Losing a parent is one of life&apos;s most difficult experiences. On top of
          the grief, there&apos;s an overwhelming amount of logistics to manage—legal
          documents, financial accounts, notifications, and countless decisions.
        </p>
        <p>
          Grief Guide will help you navigate these practical matters step by step.
          We&apos;ll create a personalized checklist based on your situation and be
          here whenever you need guidance.
        </p>
        <p className="text-stone-900 font-medium">
          First, we need to understand your situation so we can help you
          effectively.
        </p>
      </div>
    </div>
  );
}

function StepRole({
  data,
  updateData,
}: {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-900">
        What&apos;s your role?
      </h2>
      <p className="text-stone-600">
        This helps us understand what responsibilities you&apos;re handling.
      </p>

      <div className="space-y-3 mt-6">
        {ROLE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`block p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              data.userRole === option.value
                ? "border-amber-600 bg-amber-50"
                : "border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={data.userRole === option.value}
                onChange={() => updateData({ userRole: option.value })}
                className="mt-1 text-amber-600 focus:ring-amber-600"
              />
              <div>
                <div className="font-medium text-stone-900">{option.label}</div>
                <div className="text-sm text-stone-500">{option.description}</div>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function StepLocation({
  data,
  updateData,
}: {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-900">
        Where are you located?
      </h2>
      <p className="text-stone-600">
        Estate laws vary by state. This helps us provide accurate guidance for
        your situation.
      </p>

      <div className="mt-6">
        <label htmlFor="state" className="block text-sm font-medium text-stone-700 mb-2">
          State
        </label>
        <select
          id="state"
          value={data.state}
          onChange={(e) => updateData({ state: e.target.value })}
          className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:border-amber-600 text-stone-900"
        >
          <option value="">Select your state</option>
          {US_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StepDeceased({
  data,
  updateData,
}: {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-900">
        About your parent
      </h2>
      <p className="text-stone-600">
        This information helps us determine which tasks apply to your situation.
      </p>

      <div className="space-y-6 mt-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-2">
            Their name
          </label>
          <input
            type="text"
            id="name"
            value={data.deceasedName}
            onChange={(e) => updateData({ deceasedName: e.target.value })}
            placeholder="First name is fine"
            className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:border-amber-600 text-stone-900 placeholder:text-stone-400"
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-stone-700">
            Please check all that apply:
          </p>

          <CheckboxOption
            checked={data.deceasedHadSpouse}
            onChange={(checked) => updateData({ deceasedHadSpouse: checked })}
            label="Had a spouse or partner"
          />
          <CheckboxOption
            checked={data.deceasedHadWill}
            onChange={(checked) => updateData({ deceasedHadWill: checked })}
            label="Had a will"
          />
          <CheckboxOption
            checked={data.deceasedHadTrust}
            onChange={(checked) => updateData({ deceasedHadTrust: checked })}
            label="Had a trust"
          />
          <CheckboxOption
            checked={data.deceasedOwnedProperty}
            onChange={(checked) => updateData({ deceasedOwnedProperty: checked })}
            label="Owned real estate or property"
          />
          <CheckboxOption
            checked={data.deceasedHadRetirementAccounts}
            onChange={(checked) => updateData({ deceasedHadRetirementAccounts: checked })}
            label="Had retirement accounts (401k, IRA, pension)"
          />
        </div>
      </div>
    </div>
  );
}

function StepFamily({
  data,
  updateData,
}: {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-900">
        Family structure
      </h2>
      <p className="text-stone-600">
        Understanding your family helps us anticipate coordination needs.
      </p>

      <div className="space-y-6 mt-6">
        <CheckboxOption
          checked={data.hasSurvivingParent}
          onChange={(checked) => updateData({ hasSurvivingParent: checked })}
          label="There is a surviving parent"
        />

        <div>
          <label htmlFor="siblings" className="block text-sm font-medium text-stone-700 mb-2">
            How many siblings do you have?
          </label>
          <select
            id="siblings"
            value={data.numberOfSiblings}
            onChange={(e) => updateData({ numberOfSiblings: parseInt(e.target.value) })}
            className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:border-amber-600 text-stone-900"
          >
            <option value={0}>I&apos;m an only child</option>
            <option value={1}>1 sibling</option>
            <option value={2}>2 siblings</option>
            <option value={3}>3 siblings</option>
            <option value={4}>4 siblings</option>
            <option value={5}>5 or more siblings</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function StepPreferences({
  data,
  updateData,
}: {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-900">
        Your preferences
      </h2>
      <p className="text-stone-600">
        How often would you like us to check in with you?
      </p>

      <div className="space-y-3 mt-6">
        {FREQUENCY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`block p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              data.checkInFrequency === option.value
                ? "border-amber-600 bg-amber-50"
                : "border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="frequency"
                value={option.value}
                checked={data.checkInFrequency === option.value}
                onChange={() => updateData({ checkInFrequency: option.value })}
                className="mt-1 text-amber-600 focus:ring-amber-600"
              />
              <div>
                <div className="font-medium text-stone-900">{option.label}</div>
                <div className="text-sm text-stone-500">{option.description}</div>
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-6 p-4 bg-stone-50 rounded-lg">
        <p className="text-sm text-stone-600">
          You can change this anytime in your settings. We&apos;ll never send
          anything without your permission.
        </p>
      </div>
    </div>
  );
}

function CheckboxOption({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 hover:border-stone-300 cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 text-amber-600 rounded focus:ring-amber-600"
      />
      <span className="text-stone-700">{label}</span>
    </label>
  );
}
