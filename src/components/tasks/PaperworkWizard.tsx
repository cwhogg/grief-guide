"use client";

import { useState, useEffect } from "react";
import type {
  PaperworkGuide,
  PaperworkStep,
  WizardProgress,
} from "@/lib/paperwork/types";

interface PaperworkWizardProps {
  guide: PaperworkGuide;
  taskId: string;
  onComplete: () => Promise<void>;
  initialProgress?: WizardProgress;
}

export function PaperworkWizard({
  guide,
  taskId,
  onComplete,
  initialProgress,
}: PaperworkWizardProps) {
  const [currentStep, setCurrentStep] = useState(0); // 0 = intro/before you begin
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    new Set(initialProgress?.completedSteps || [])
  );
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>(
    initialProgress?.checklistItems || {}
  );
  const [showFAQ, setShowFAQ] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const totalSteps = guide.steps.length + 1; // +1 for intro
  const isIntroStep = currentStep === 0;
  const currentGuideStep = isIntroStep ? null : guide.steps[currentStep - 1];

  // Save progress to localStorage
  useEffect(() => {
    const progress: WizardProgress = {
      currentStep,
      completedSteps: Array.from(completedSteps),
      checklistItems,
      startedAt: initialProgress?.startedAt || new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`paperwork-progress-${taskId}`, JSON.stringify(progress));
  }, [currentStep, completedSteps, checklistItems, taskId, initialProgress]);

  const handleNext = () => {
    if (currentGuideStep) {
      setCompletedSteps((prev) => new Set([...prev, currentGuideStep.id]));
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await onComplete();
      localStorage.removeItem(`paperwork-progress-${taskId}`);
    } finally {
      setIsCompleting(false);
    }
  };

  const toggleChecklistItem = (key: string) => {
    setChecklistItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isLastStep = currentStep === totalSteps - 1;
  const progressPercentage = Math.round((currentStep / (totalSteps - 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--gray-900)]">
              {guide.title}
            </h1>
            <p className="text-[var(--gray-500)] mt-1">{guide.description}</p>
            <p className="text-sm text-[var(--gray-400)] mt-2">
              Estimated time: {guide.estimatedTime}
            </p>
          </div>
          <button
            onClick={() => setShowFAQ(!showFAQ)}
            className="text-[var(--primary-600)] hover:text-[var(--primary-700)] text-sm font-medium"
          >
            {showFAQ ? "Hide FAQ" : "View FAQ"}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-[var(--gray-500)] mb-2">
            <span>
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span>{progressPercentage}% complete</span>
          </div>
          <div className="h-2 bg-[var(--gray-100)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--primary-600)] transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Step navigation dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentStep
                  ? "bg-[var(--primary-600)]"
                  : index < currentStep || completedSteps.has(guide.steps[index - 1]?.id)
                  ? "bg-[var(--primary-500)]"
                  : "bg-[var(--gray-200)] hover:bg-[var(--gray-300)]"
              }`}
              title={index === 0 ? "Before You Begin" : guide.steps[index - 1]?.title}
            />
          ))}
        </div>
      </div>

      {/* FAQ Panel */}
      {showFAQ && (
        <div className="bg-blue-50 rounded-[var(--radius-lg)] border border-blue-200 p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {guide.frequentlyAskedQuestions.map((faq, index) => (
              <details key={index} className="group">
                <summary className="cursor-pointer text-blue-800 font-medium hover:text-blue-900 list-none flex items-start gap-2">
                  <svg
                    className="w-5 h-5 mt-0.5 flex-shrink-0 transition-transform group-open:rotate-90"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  {faq.question}
                </summary>
                <p className="mt-2 ml-7 text-blue-700 text-sm leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="card">
        {isIntroStep ? (
          <IntroStep guide={guide} checklistItems={checklistItems} toggleChecklistItem={toggleChecklistItem} />
        ) : (
          currentGuideStep && (
            <StepContent
              step={currentGuideStep}
              checklistItems={checklistItems}
              toggleChecklistItem={toggleChecklistItem}
            />
          )
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className="px-4 py-2 text-[var(--gray-600)] hover:text-[var(--gray-900)] disabled:opacity-0 disabled:cursor-default transition-opacity min-h-[44px]"
        >
          Back
        </button>

        {isLastStep ? (
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className="btn btn-primary disabled:opacity-50"
          >
            {isCompleting ? "Marking Complete..." : "Mark Task Complete"}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="btn btn-primary"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

function IntroStep({
  guide,
  checklistItems,
  toggleChecklistItem,
}: {
  guide: PaperworkGuide;
  checklistItems: Record<string, boolean>;
  toggleChecklistItem: (key: string) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Introduction */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--gray-900)] mb-4">
          Before You Begin
        </h2>
        <div className="max-w-none">
          <p className="text-[var(--gray-600)] leading-relaxed">
            {guide.introduction.overview}
          </p>
        </div>
        <div className="mt-4 p-4 bg-[var(--accent-50)] rounded-[var(--radius-md)] border border-[var(--accent-200)]">
          <p className="text-[var(--accent-800)]">{guide.introduction.reassurance}</p>
        </div>
        {guide.introduction.deadline && (
          <div className="mt-4 p-4 bg-blue-50 rounded-[var(--radius-md)] border border-blue-200">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-blue-800">{guide.introduction.deadline}</p>
            </div>
          </div>
        )}
      </div>

      {/* Documents Required */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-3">
          Documents You&apos;ll Need
        </h3>
        <div className="space-y-3">
          {guide.beforeYouBegin.documentsRequired.map((doc, index) => {
            const key = `doc-${index}`;
            return (
              <label
                key={index}
                className={`flex items-start gap-3 p-4 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                  checklistItems[key]
                    ? "bg-[var(--primary-50)] border-[var(--primary-300)]"
                    : "bg-white border-[var(--gray-200)] hover:border-[var(--gray-300)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checklistItems[key] || false}
                  onChange={() => toggleChecklistItem(key)}
                  className="mt-1 w-5 h-5 text-[var(--primary-600)] rounded focus:ring-[var(--primary-600)]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--gray-900)]">{doc.item}</span>
                    {doc.required && (
                      <span className="text-xs bg-[var(--accent-100)] text-[var(--accent-700)] px-2 py-0.5 rounded-full">
                        Required
                      </span>
                    )}
                    {doc.conditionalNote && (
                      <span className="text-xs bg-[var(--gray-100)] text-[var(--gray-600)] px-2 py-0.5 rounded-full">
                        {doc.conditionalNote}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--gray-500)] mt-1">{doc.details}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Information Needed */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-3">
          Information to Have Ready
        </h3>
        <ul className="space-y-2">
          {guide.beforeYouBegin.informationNeeded.map((info, index) => (
            <li key={index} className="flex items-start gap-2 text-[var(--gray-600)]">
              <svg
                className="w-5 h-5 text-[var(--gray-400)] mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              {info}
            </li>
          ))}
        </ul>
      </div>

      {/* Tips */}
      {guide.beforeYouBegin.tips.length > 0 && (
        <div className="bg-blue-50 rounded-[var(--radius-md)] p-4 border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Tips</h4>
          <ul className="space-y-2">
            {guide.beforeYouBegin.tips.map((tip, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-blue-700"
              >
                <svg
                  className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StepContent({
  step,
  checklistItems,
  toggleChecklistItem,
}: {
  step: PaperworkStep;
  checklistItems: Record<string, boolean>;
  toggleChecklistItem: (key: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Step header */}
      <div>
        <div className="text-sm text-[var(--primary-600)] font-medium mb-1">
          Step {step.number}
        </div>
        <h2 className="text-xl font-semibold text-[var(--gray-900)]">{step.title}</h2>
        <p className="text-[var(--gray-600)] mt-2">{step.description}</p>
        <p className="text-sm text-[var(--gray-400)] mt-1">
          Estimated time: {step.estimatedTime}
        </p>
      </div>

      {/* Instructions */}
      {step.instructions && step.instructions.length > 0 && (
        <div>
          <h3 className="font-medium text-[var(--gray-900)] mb-3">Instructions</h3>
          <div className="space-y-4">
            {step.instructions.map((instruction, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-[var(--gray-50)] rounded-[var(--radius-md)]"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--primary-600)] text-white text-sm flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-[var(--gray-900)]">{instruction.text}</p>
                  <p className="text-sm text-[var(--gray-500)] mt-1">
                    {instruction.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options (for choosing how to apply) */}
      {step.options && step.options.length > 0 && (
        <div>
          <h3 className="font-medium text-[var(--gray-900)] mb-3">Your Options</h3>
          <div className="space-y-4">
            {step.options.map((option, index) => (
              <div
                key={index}
                className={`p-4 rounded-[var(--radius-md)] border-2 ${
                  option.recommended
                    ? "border-[var(--primary-300)] bg-[var(--primary-50)]"
                    : "border-[var(--gray-200)] bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium text-[var(--gray-900)]">{option.method}</h4>
                  {option.recommended && (
                    <span className="text-xs bg-[var(--primary-200)] text-[var(--primary-800)] px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-[var(--gray-600)] text-sm">{option.description}</p>
                {option.hours && (
                  <p className="text-[var(--gray-500)] text-sm mt-1">{option.hours}</p>
                )}
                <div className="grid sm:grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs font-medium text-[var(--primary-700)] mb-1">Pros</p>
                    <ul className="space-y-1">
                      {option.pros.map((pro, i) => (
                        <li
                          key={i}
                          className="text-sm text-[var(--primary-600)] flex items-start gap-1"
                        >
                          <span>+</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--accent-700)] mb-1">Cons</p>
                    <ul className="space-y-1">
                      {option.cons.map((con, i) => (
                        <li
                          key={i}
                          className="text-sm text-[var(--accent-600)] flex items-start gap-1"
                        >
                          <span>-</span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="text-sm text-[var(--gray-500)] mt-3 italic">
                  Best for: {option.bestFor}
                </p>
              </div>
            ))}
          </div>
          {step.recommendation && (
            <div className="mt-4 p-4 bg-[var(--accent-50)] rounded-[var(--radius-md)] border border-[var(--accent-200)]">
              <p className="text-[var(--accent-800)]">{step.recommendation}</p>
            </div>
          )}
        </div>
      )}

      {/* Form sections */}
      {step.sections && step.sections.length > 0 && (
        <div>
          <h3 className="font-medium text-[var(--gray-900)] mb-3">
            What You&apos;ll Be Asked
          </h3>
          <p className="text-[var(--gray-500)] text-sm mb-4">
            Here&apos;s what each section of the application covers. Don&apos;t
            worry—the representative will guide you through each part.
          </p>
          <div className="space-y-4">
            {step.sections.map((section, index) => (
              <div key={index} className="border border-[var(--gray-200)] rounded-[var(--radius-md)] overflow-hidden">
                <div className="bg-[var(--gray-50)] px-4 py-2 border-b border-[var(--gray-200)]">
                  <h4 className="font-medium text-[var(--gray-900)]">{section.name}</h4>
                </div>
                <div className="p-4 space-y-3">
                  {section.fields.map((field, fieldIndex) => (
                    <div key={fieldIndex}>
                      <p className="font-medium text-[var(--gray-800)]">{field.field}</p>
                      <p className="text-sm text-[var(--gray-500)] mt-1">
                        {field.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {step.timeline && step.timeline.length > 0 && (
        <div>
          <h3 className="font-medium text-[var(--gray-900)] mb-3">What to Expect</h3>
          <div className="space-y-4">
            {step.timeline.map((event, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-[var(--primary-600)]" />
                  {index < step.timeline!.length - 1 && (
                    <div className="w-0.5 h-full bg-[var(--gray-200)] mt-1" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="font-medium text-[var(--gray-900)]">{event.when}</p>
                  <p className="text-[var(--gray-600)] text-sm mt-1">{event.what}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What to save */}
      {step.whatToSaveForRecords && step.whatToSaveForRecords.length > 0 && (
        <div className="bg-[var(--gray-50)] rounded-[var(--radius-md)] p-4">
          <h4 className="font-medium text-[var(--gray-900)] mb-2">
            Save for Your Records
          </h4>
          <ul className="space-y-1">
            {step.whatToSaveForRecords.map((item, index) => (
              <li
                key={index}
                className="text-sm text-[var(--gray-600)] flex items-start gap-2"
              >
                <svg
                  className="w-4 h-4 text-[var(--gray-400)] mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* If denied */}
      {step.ifDenied && (
        <div className="bg-[var(--accent-50)] rounded-[var(--radius-md)] p-4 border border-[var(--accent-200)]">
          <h4 className="font-medium text-[var(--accent-900)] mb-2">
            If Your Application is Denied
          </h4>
          <p className="text-[var(--accent-800)] text-sm mb-3">{step.ifDenied.dontPanic}</p>
          <ul className="space-y-1">
            {step.ifDenied.steps.map((s, index) => (
              <li
                key={index}
                className="text-sm text-[var(--accent-700)] flex items-start gap-2"
              >
                <span className="font-medium">{index + 1}.</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ongoing responsibilities */}
      {step.ongoingResponsibilities && step.ongoingResponsibilities.length > 0 && (
        <div>
          <h4 className="font-medium text-[var(--gray-900)] mb-2">
            Ongoing Responsibilities
          </h4>
          <ul className="space-y-2">
            {step.ongoingResponsibilities.map((item, index) => (
              <li
                key={index}
                className="text-[var(--gray-600)] flex items-start gap-2"
              >
                <svg
                  className="w-5 h-5 text-[var(--gray-400)] mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Helpful resources */}
      {step.helpfulResources && step.helpfulResources.length > 0 && (
        <div>
          <h4 className="font-medium text-[var(--gray-900)] mb-2">Helpful Resources</h4>
          <div className="space-y-2">
            {step.helpfulResources.map((resource, index) => (
              <a
                key={index}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-blue-50 rounded-[var(--radius-md)] hover:bg-blue-100 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <div>
                  <p className="font-medium text-blue-900">{resource.name}</p>
                  <p className="text-sm text-blue-600">{resource.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Common mistakes */}
      {step.commonMistakes && step.commonMistakes.length > 0 && (
        <div className="bg-[var(--accent-50)] rounded-[var(--radius-md)] p-4 border border-[var(--accent-200)]">
          <h4 className="font-medium text-[var(--accent-900)] mb-3">
            Common Mistakes to Avoid
          </h4>
          <div className="space-y-3">
            {step.commonMistakes.map((mistake, index) => (
              <div key={index}>
                <p className="font-medium text-[var(--accent-800)]">{mistake.mistake}</p>
                <p className="text-sm text-[var(--accent-700)] mt-1">{mistake.prevention}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checkpoints */}
      {step.checkpoints && step.checkpoints.length > 0 && (
        <div>
          <h3 className="font-medium text-[var(--gray-900)] mb-3">Checklist</h3>
          <div className="space-y-2">
            {step.checkpoints.map((checkpoint, index) => {
              const key = `step-${step.id}-checkpoint-${index}`;
              return (
                <label
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                    checklistItems[key]
                      ? "bg-[var(--primary-50)] border-[var(--primary-300)]"
                      : "bg-white border-[var(--gray-200)] hover:border-[var(--gray-300)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checklistItems[key] || false}
                    onChange={() => toggleChecklistItem(key)}
                    className="w-5 h-5 text-[var(--primary-600)] rounded focus:ring-[var(--primary-600)]"
                  />
                  <span className="text-[var(--gray-700)]">{checkpoint}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Tips */}
      {step.tips && step.tips.length > 0 && (
        <div className="bg-blue-50 rounded-[var(--radius-md)] p-4 border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Tips</h4>
          <ul className="space-y-2">
            {step.tips.map((tip, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-blue-700"
              >
                <svg
                  className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
