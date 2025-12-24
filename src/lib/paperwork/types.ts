export interface PaperworkGuide {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  introduction: {
    overview: string;
    reassurance: string;
    deadline: string;
  };
  beforeYouBegin: {
    documentsRequired: DocumentRequirement[];
    informationNeeded: string[];
    tips: string[];
  };
  steps: PaperworkStep[];
  frequentlyAskedQuestions: FAQ[];
}

export interface DocumentRequirement {
  item: string;
  details: string;
  required: boolean;
  conditionalNote?: string;
}

export interface PaperworkStep {
  id: string;
  number: number;
  title: string;
  description: string;
  estimatedTime: string;
  instructions?: StepInstruction[];
  options?: ApplicationOption[];
  sections?: FormSection[];
  timeline?: TimelineEvent[];
  commonMistakes?: CommonMistake[];
  checkpoints?: string[];
  tips?: string[];
  recommendation?: string;
  whatToSaveForRecords?: string[];
  ifDenied?: {
    dontPanic: string;
    steps: string[];
  };
  ongoingResponsibilities?: string[];
  helpfulResources?: HelpfulResource[];
}

export interface StepInstruction {
  text: string;
  details: string;
}

export interface ApplicationOption {
  method: string;
  recommended: boolean;
  description: string;
  hours?: string;
  pros: string[];
  cons: string[];
  bestFor: string;
}

export interface FormSection {
  name: string;
  fields: FormField[];
}

export interface FormField {
  field: string;
  explanation: string;
}

export interface TimelineEvent {
  when: string;
  what: string;
}

export interface CommonMistake {
  mistake: string;
  prevention: string;
}

export interface HelpfulResource {
  name: string;
  url: string;
  description: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface WizardProgress {
  currentStep: number;
  completedSteps: string[];
  checklistItems: Record<string, boolean>;
  startedAt: string;
  lastUpdatedAt: string;
}
