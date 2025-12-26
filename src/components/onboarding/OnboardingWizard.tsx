"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import type { OnboardingData, UserRole, CheckInFrequency, GriefStage } from "@/lib/supabase/types";

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

const STAGE_OPTIONS: { value: GriefStage; label: string; description: string }[] = [
  {
    value: "anticipating",
    label: "My parent is sick or in hospice",
    description: "They're still alive, but you're preparing for what's ahead",
  },
  {
    value: "immediate",
    label: "My parent just passed",
    description: "It happened recently and you're in the thick of it",
  },
  {
    value: "navigating",
    label: "My parent passed a while ago",
    description: "You're still sorting through everything",
  },
];

const initialData: OnboardingData = {
  griefStage: "immediate",
  userRole: "executor",
  state: "",
  deceasedName: "",
  deceasedHadSpouse: false,
  deceasedHadWill: null,
  deceasedHadTrust: null,
  deceasedOwnedProperty: null,
  deceasedHadRetirementAccounts: null,
  hasSurvivingParent: false,
  numberOfSiblings: 0,
  checkInFrequency: "weekly",
};

export function OnboardingWizard() {
  const router = useRouter();
  const { updateProfile } = useUser();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 7;

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
      // Save to local state (demo mode)
      await updateProfile({
        grief_stage: data.griefStage,
        user_role: data.userRole,
        state: data.state,
        deceased_name: data.deceasedName,
        deceased_had_spouse: data.deceasedHadSpouse,
        deceased_had_will: data.deceasedHadWill,
        deceased_had_trust: data.deceasedHadTrust,
        deceased_owned_property: data.deceasedOwnedProperty,
        deceased_had_retirement_accounts: data.deceasedHadRetirementAccounts,
        has_surviving_parent: data.hasSurvivingParent,
        number_of_siblings: data.numberOfSiblings,
        check_in_frequency: data.checkInFrequency,
        onboarding_completed: true,
      });

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: // Welcome
        return true;
      case 2: // Stage
        return !!data.griefStage;
      case 3: // Role
        return !!data.userRole;
      case 4: // Location
        return !!data.state;
      case 5: // Deceased info
        return !!data.deceasedName.trim();
      case 6: // Family
        return true;
      case 7: // Preferences
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
          {step === 2 && <StepStage data={data} updateData={updateData} />}
          {step === 3 && <StepRole data={data} updateData={updateData} />}
          {step === 4 && <StepLocation data={data} updateData={updateData} />}
          {step === 5 && <StepDeceased data={data} updateData={updateData} />}
          {step === 6 && <StepFamily data={data} updateData={updateData} />}
          {step === 7 && <StepPreferences data={data} updateData={updateData} />}
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
          Whether you&apos;re preparing for a parent&apos;s passing, in the immediate
          aftermath, or still navigating the logistics months later—there&apos;s
          an overwhelming amount to manage on top of everything you&apos;re feeling.
        </p>
        <p>
          Grief Guide will help you navigate these practical matters step by step.
          We&apos;ll create a personalized checklist based on where you are right now
          and be here whenever you need guidance or just someone to talk to.
        </p>
        <p className="text-stone-900 font-medium">
          First, we need to understand your situation so we can help you
          effectively.
        </p>
      </div>
    </div>
  );
}

function StepStage({
  data,
  updateData,
}: {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-900">
        Where are you in this right now?
      </h2>
      <p className="text-stone-600">
        This helps us give you the right guidance for where you are.
      </p>

      <div className="space-y-3 mt-6">
        {STAGE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`block p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              data.griefStage === option.value
                ? "border-amber-600 bg-amber-50"
                : "border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="stage"
                value={option.value}
                checked={data.griefStage === option.value}
                onChange={() => updateData({ griefStage: option.value })}
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
  const isAnticipating = data.griefStage === "anticipating";

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-900">
        About your parent
      </h2>
      <p className="text-stone-600">
        {isAnticipating
          ? "This helps us suggest what to find out and prepare for. It's okay if you don't know some of these yet."
          : "This information helps us determine which tasks apply to your situation."}
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
            {isAnticipating ? "What do you know so far?" : "Please check all that apply:"}
          </p>

          <CheckboxOption
            checked={data.deceasedHadSpouse}
            onChange={(checked) => updateData({ deceasedHadSpouse: checked })}
            label={isAnticipating ? "Has a spouse or partner" : "Had a spouse or partner"}
          />
          <TriStateOption
            value={data.deceasedHadWill}
            onChange={(value) => updateData({ deceasedHadWill: value })}
            label={isAnticipating ? "Has a will" : "Had a will"}
            showUnsure={isAnticipating}
          />
          <TriStateOption
            value={data.deceasedHadTrust}
            onChange={(value) => updateData({ deceasedHadTrust: value })}
            label={isAnticipating ? "Has a trust" : "Had a trust"}
            showUnsure={isAnticipating}
          />
          <TriStateOption
            value={data.deceasedOwnedProperty}
            onChange={(value) => updateData({ deceasedOwnedProperty: value })}
            label={isAnticipating ? "Owns real estate or property" : "Owned real estate or property"}
            showUnsure={isAnticipating}
          />
          <TriStateOption
            value={data.deceasedHadRetirementAccounts}
            onChange={(value) => updateData({ deceasedHadRetirementAccounts: value })}
            label={isAnticipating ? "Has retirement accounts (401k, IRA, pension)" : "Had retirement accounts (401k, IRA, pension)"}
            showUnsure={isAnticipating}
          />
        </div>

        {isAnticipating && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              Don&apos;t worry if you&apos;re not sure about some of these. Part of what we&apos;ll
              help you do is have those conversations and find out.
            </p>
          </div>
        )}
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

function TriStateOption({
  value,
  onChange,
  label,
  showUnsure = false,
}: {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  label: string;
  showUnsure?: boolean;
}) {
  if (!showUnsure) {
    // Render as simple checkbox when not showing unsure option
    return (
      <label className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 hover:border-stone-300 cursor-pointer transition-colors">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="w-5 h-5 text-amber-600 rounded focus:ring-amber-600"
        />
        <span className="text-stone-700">{label}</span>
      </label>
    );
  }

  return (
    <div className="p-3 rounded-lg border border-stone-200">
      <div className="text-stone-700 mb-2">{label}</div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            value === true
              ? "bg-amber-600 text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            value === false
              ? "bg-amber-600 text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          No
        </button>
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            value === null
              ? "bg-amber-600 text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          I don&apos;t know
        </button>
      </div>
    </div>
  );
}
