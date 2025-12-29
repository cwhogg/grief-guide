"use client";

import { useState, useEffect } from "react";

// ============================================
// PHONE BUTTON COMPONENT
// Format: [phone:NUMBER:LABEL]
// ============================================

interface PhoneButtonProps {
  number: string;
  label: string;
}

export function PhoneButton({ number, label }: PhoneButtonProps) {
  // Clean number for tel: link
  const cleanNumber = number.replace(/[^0-9+]/g, "");

  return (
    <a
      href={`tel:${cleanNumber}`}
      className="inline-flex items-center gap-2 px-4 py-3 bg-[var(--primary-500)] text-white font-medium rounded-[var(--radius-md)] hover:bg-[var(--primary-600)] transition-colors min-h-[48px]"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
      {label}
    </a>
  );
}

// ============================================
// CALL SCRIPT CARD COMPONENT
// Format: [call-script:TYPE]
// ============================================

interface CallScript {
  title: string;
  whatToSay: string;
  theyWillAsk: string[];
  duration: string;
  tips?: string[];
}

const CALL_SCRIPTS: Record<string, CallScript> = {
  SOCIAL_SECURITY: {
    title: "Social Security Call",
    whatToSay: "I'm calling to report a death. My [mother/father], [Name], passed away on [date].",
    theyWillAsk: [
      "Deceased's Social Security number",
      "Date of death",
      "Your relationship to the deceased",
      "Your contact information",
    ],
    duration: "15-20 minutes",
    tips: ["Ask about survivor benefits if there's a living spouse"],
  },
  EMPLOYER_NOTIFICATION: {
    title: "HR/Employer Notification",
    whatToSay: "I'm calling to notify you that [Name] has passed away. They worked as [role]. I'm their [relationship].",
    theyWillAsk: [
      "Final paycheck — where will it be sent?",
      "Life insurance — did they have coverage through work?",
      "401k/pension — what's the process to claim it?",
      "COBRA — health insurance continuation for dependents?",
    ],
    duration: "10-15 minutes",
    tips: ["Have death certificate ready", "Ask about ALL benefits, not just paycheck"],
  },
  FUNERAL_HOME: {
    title: "Funeral Home Call",
    whatToSay: "My [mother/father] passed away and I need help with arrangements.",
    theyWillAsk: [
      "Where is the body currently?",
      "Do you know if they wanted burial or cremation?",
      "Your name and contact information",
      "Any pre-planned arrangements?",
    ],
    duration: "10-15 minutes",
    tips: ["You don't need to decide everything on this call", "Ask about pricing and payment plans"],
  },
  INSURANCE_CLAIM: {
    title: "Insurance Claim Call",
    whatToSay: "I need to file a death claim on policy number [X]. The policyholder has passed away.",
    theyWillAsk: [
      "Policy number",
      "Policyholder's name and date of birth",
      "Date of death",
      "Beneficiary information",
    ],
    duration: "15-20 minutes",
    tips: ["Have death certificate ready", "Ask how long until payment"],
  },
  BANK_NOTIFICATION: {
    title: "Bank Notification",
    whatToSay: "I'm calling to notify you of an account holder's death. [Name] passed away and I'm [the executor/next of kin].",
    theyWillAsk: [
      "Account holder's name and account number",
      "Your relationship and authority (executor, POA)",
      "What you need (freeze account, access, close)",
    ],
    duration: "15-30 minutes",
    tips: ["Have death certificate and proof of executor status ready", "Ask about joint accounts"],
  },
};

interface CallScriptCardProps {
  type: string;
  phoneNumber?: string;
  phoneLabel?: string;
}

export function CallScriptCard({ type, phoneNumber, phoneLabel }: CallScriptCardProps) {
  const script = CALL_SCRIPTS[type];

  if (!script) {
    return (
      <div className="my-3 p-4 bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-[var(--radius-lg)]">
        <p className="text-[var(--gray-600)]">Call script not found: {type}</p>
      </div>
    );
  }

  return (
    <div className="my-3 p-4 bg-white border border-[var(--primary-200)] rounded-[var(--radius-lg)] shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-[var(--primary-100)] flex items-center justify-center">
          <svg className="w-4 h-4 text-[var(--primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <h3 className="font-semibold text-[var(--gray-900)]">{script.title}</h3>
        <span className="ml-auto text-xs text-[var(--gray-500)] bg-[var(--gray-100)] px-2 py-1 rounded">
          ~{script.duration}
        </span>
      </div>

      {/* What to say */}
      <div className="mb-4 p-3 bg-[var(--primary-50)] border-l-4 border-[var(--primary-500)] rounded-r-[var(--radius-md)]">
        <p className="text-sm font-medium text-[var(--gray-700)] mb-1">What to say:</p>
        <p className="text-[var(--gray-900)] italic">"{script.whatToSay}"</p>
      </div>

      {/* They'll ask */}
      <div className="mb-4">
        <p className="text-sm font-medium text-[var(--gray-700)] mb-2">They'll ask about:</p>
        <ul className="space-y-1">
          {script.theyWillAsk.map((item, i) => (
            <li key={i} className="text-sm text-[var(--gray-600)] flex items-start gap-2">
              <span className="text-[var(--primary-500)] mt-0.5">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Tips */}
      {script.tips && script.tips.length > 0 && (
        <div className="mb-4 p-3 bg-[var(--accent-400)]/10 rounded-[var(--radius-md)]">
          <p className="text-sm font-medium text-[var(--accent-600)] mb-1">Tips:</p>
          {script.tips.map((tip, i) => (
            <p key={i} className="text-sm text-[var(--gray-700)]">• {tip}</p>
          ))}
        </div>
      )}

      {/* Phone button */}
      {phoneNumber && (
        <PhoneButton number={phoneNumber} label={phoneLabel || "Call Now"} />
      )}
    </div>
  );
}

// ============================================
// INTERACTIVE CHECKLIST COMPONENT
// Format: [checklist:TYPE]
// ============================================

interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
}

interface ChecklistDefinition {
  title: string;
  items: ChecklistItem[];
}

const CHECKLISTS: Record<string, ChecklistDefinition> = {
  WILL_SEARCH: {
    title: "Where to Look for a Will",
    items: [
      { id: "filing", label: "Filing cabinet", hint: "Look for 'Legal', 'Important', or 'Estate' folders" },
      { id: "safe", label: "Home safe or lockbox", hint: "Fireproof safe, locked drawer" },
      { id: "deposit", label: "Safe deposit box", hint: "At their bank (may need death certificate to access)" },
      { id: "attorney", label: "Their attorney", hint: "If they had a lawyer, call and ask" },
      { id: "email", label: "Email search", hint: "Search 'will', 'estate', 'attorney', 'trust'" },
      { id: "spouse", label: "Surviving spouse", hint: "They may know or have a copy" },
    ],
  },
  DOCUMENT_HUNT: {
    title: "Important Documents to Find",
    items: [
      { id: "will", label: "Will or Trust" },
      { id: "deed", label: "Property deed" },
      { id: "insurance", label: "Insurance policies" },
      { id: "bank", label: "Bank statements" },
      { id: "tax", label: "Recent tax returns" },
      { id: "birth", label: "Birth certificate" },
      { id: "marriage", label: "Marriage certificate" },
      { id: "military", label: "Military discharge papers (DD-214)" },
      { id: "vehicle", label: "Vehicle titles" },
    ],
  },
  DEATH_CERT_NEEDS: {
    title: "Who Needs Death Certificates",
    items: [
      { id: "ssa", label: "Social Security", hint: "1 copy" },
      { id: "banks", label: "Each bank account", hint: "1 copy each" },
      { id: "insurance", label: "Each insurance policy", hint: "1 copy each" },
      { id: "employer", label: "Employer/pension", hint: "1 copy" },
      { id: "mortgage", label: "Mortgage company", hint: "1 copy" },
      { id: "dmv", label: "DMV/vehicle titles", hint: "1 copy" },
      { id: "probate", label: "Probate court", hint: "2 copies" },
      { id: "extras", label: "Extras for surprises", hint: "2-3 copies" },
    ],
  },
  SECURE_HOME: {
    title: "Secure the Home",
    items: [
      { id: "locks", label: "Lock all doors and windows" },
      { id: "thermostat", label: "Adjust thermostat", hint: "Prevent frozen pipes or mold" },
      { id: "food", label: "Remove perishable food" },
      { id: "trash", label: "Take out trash" },
      { id: "pets", label: "Check for pets (!)" },
      { id: "mail", label: "Collect mail or set up hold" },
      { id: "stove", label: "Turn off stove/oven" },
      { id: "plants", label: "Water plants or bring home" },
      { id: "lights", label: "Set lights on timers" },
      { id: "neighbor", label: "Alert a trusted neighbor" },
    ],
  },
  INSURANCE_SEARCH: {
    title: "Where to Find Life Insurance",
    items: [
      { id: "files", label: "Their files", hint: "Look for folders labeled 'Insurance' or company names" },
      { id: "statements", label: "Bank/card statements", hint: "Look for recurring premium payments" },
      { id: "mail", label: "Mail", hint: "Watch for policy statements or premium notices" },
      { id: "email", label: "Email", hint: "Search insurance company names" },
      { id: "employer", label: "Their employer", hint: "Many jobs include life insurance" },
      { id: "spouse", label: "Surviving spouse", hint: "May know or be the beneficiary" },
    ],
  },
  SSN_SEARCH: {
    title: "Where to Find Social Security Number",
    items: [
      { id: "card", label: "Social Security card" },
      { id: "medicare", label: "Medicare card", hint: "Number is based on SSN" },
      { id: "tax", label: "Past tax returns" },
      { id: "wallet", label: "Wallet or purse" },
      { id: "files", label: "Their files", hint: "Look for government correspondence" },
      { id: "spouse", label: "Ask surviving spouse" },
    ],
  },
};

interface InteractiveChecklistProps {
  type: string;
  onItemToggle?: (itemId: string, checked: boolean) => void;
}

export function InteractiveChecklist({ type, onItemToggle }: InteractiveChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`checklist-${type}`);
    if (stored) {
      try {
        setCheckedItems(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error("Failed to parse checklist state:", e);
      }
    }
  }, [type]);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(`checklist-${type}`, JSON.stringify([...checkedItems]));
  }, [checkedItems, type]);

  const checklist = CHECKLISTS[type];

  if (!checklist) {
    return (
      <div className="my-3 p-4 bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-[var(--radius-lg)]">
        <p className="text-[var(--gray-600)]">Checklist not found: {type}</p>
      </div>
    );
  }

  const handleToggle = (itemId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
        onItemToggle?.(itemId, false);
      } else {
        next.add(itemId);
        onItemToggle?.(itemId, true);
      }
      return next;
    });
  };

  const progress = checkedItems.size / checklist.items.length;

  return (
    <div className="my-3 p-4 bg-white border border-[var(--primary-200)] rounded-[var(--radius-lg)] shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[var(--gray-900)]">{checklist.title}</h3>
        <span className="text-xs text-[var(--gray-500)]">
          {checkedItems.size}/{checklist.items.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[var(--gray-100)] rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-[var(--primary-500)] transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Items */}
      <div className="space-y-2">
        {checklist.items.map((item) => {
          const isChecked = checkedItems.has(item.id);
          return (
            <label
              key={item.id}
              className={`flex items-start gap-3 p-2 rounded-[var(--radius-md)] cursor-pointer transition-colors ${
                isChecked ? "bg-[var(--primary-50)]" : "hover:bg-[var(--gray-50)]"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(item.id)}
                className="mt-0.5 w-5 h-5 rounded border-[var(--gray-300)] text-[var(--primary-500)] focus:ring-[var(--primary-500)]"
              />
              <div className="flex-1">
                <span className={`text-sm ${isChecked ? "text-[var(--gray-500)] line-through" : "text-[var(--gray-900)]"}`}>
                  {item.label}
                </span>
                {item.hint && (
                  <p className={`text-xs mt-0.5 ${isChecked ? "text-[var(--gray-400)]" : "text-[var(--gray-500)]"}`}>
                    {item.hint}
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// UNIFIED PARSER
// ============================================

export interface ParsedContent {
  segments: Array<{
    type: "text" | "phone" | "call-script" | "checklist";
    content: string;
    // For phone
    phoneNumber?: string;
    phoneLabel?: string;
    // For call-script
    scriptType?: string;
    // For checklist
    checklistType?: string;
  }>;
}

export function parseTaskFlowContent(content: string): ParsedContent {
  const segments: ParsedContent["segments"] = [];

  // Pattern to match all special tags
  const tagPattern = /\[phone:([^:]+):([^\]]+)\]|\[call-script:([^\]]+)\]|\[checklist:([^\]]+)\]/g;

  let lastIndex = 0;
  let match;

  while ((match = tagPattern.exec(content)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) {
        segments.push({ type: "text", content: text });
      }
    }

    // Determine which tag matched
    if (match[1] && match[2]) {
      // Phone: [phone:NUMBER:LABEL]
      segments.push({
        type: "phone",
        content: match[0],
        phoneNumber: match[1],
        phoneLabel: match[2],
      });
    } else if (match[3]) {
      // Call script: [call-script:TYPE]
      segments.push({
        type: "call-script",
        content: match[0],
        scriptType: match[3],
      });
    } else if (match[4]) {
      // Checklist: [checklist:TYPE]
      segments.push({
        type: "checklist",
        content: match[0],
        checklistType: match[4],
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      segments.push({ type: "text", content: text });
    }
  }

  // If no segments, return the whole content as text
  if (segments.length === 0 && content.trim()) {
    segments.push({ type: "text", content: content.trim() });
  }

  return { segments };
}
