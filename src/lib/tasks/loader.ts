import type { GriefStage, KnowledgeStatus, Task, TimelineCategory, TaskType } from "@/lib/supabase/types";

// Import task templates
import anticipatingData from "../../../docs/knowledge/tasks/anticipating.json";
import immediateData from "../../../docs/knowledge/tasks/immediate.json";
import firstWeekData from "../../../docs/knowledge/tasks/first-week.json";
import firstMonthData from "../../../docs/knowledge/tasks/first-month.json";
import ongoingData from "../../../docs/knowledge/tasks/ongoing.json";
import discoveryData from "../../../docs/knowledge/tasks/discovery.json";

interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  task_type: string;
  priority: number;
  stages: string[];
  why_it_matters: string;
  documents_needed: string[];
  tips: string[];
  is_paperwork_task: boolean;
  paperwork_wizard_id: string | null;
}

interface DiscoveryTaskTemplate extends TaskTemplate {
  triggers_on_unknown: string;
  who_to_ask: string[];
  what_to_ask: string[];
  where_to_look: string[];
  if_none: string;
}

interface KnowledgeStatusMap {
  will: KnowledgeStatus;
  trust: KnowledgeStatus;
  property: KnowledgeStatus;
  accounts: KnowledgeStatus;
  insurance: KnowledgeStatus;
}

export interface GetTasksOptions {
  griefStage?: GriefStage;
  userRole?: string;
  state?: string | null;
  knowsWill?: KnowledgeStatus | null;
  knowsTrust?: KnowledgeStatus | null;
  knowsProperty?: KnowledgeStatus | null;
  knowsAccounts?: KnowledgeStatus | null;
  knowsInsurance?: KnowledgeStatus | null;
}

export function getTasksForUser(options: GetTasksOptions): Task[] {
  const griefStage = options.griefStage || "immediate";

  const knowledgeStatus: KnowledgeStatusMap = {
    will: options.knowsWill || "unknown",
    trust: options.knowsTrust || "unknown",
    property: options.knowsProperty || "unknown",
    accounts: options.knowsAccounts || "unknown",
    insurance: options.knowsInsurance || "unknown",
  };

  const allTemplates: (TaskTemplate & { timeline_category: string })[] = [
    ...anticipatingData.tasks.map((t) => ({ ...t, timeline_category: "anticipating" } as TaskTemplate & { timeline_category: string })),
    ...immediateData.tasks.map((t) => ({ ...t, timeline_category: "immediate" } as TaskTemplate & { timeline_category: string })),
    ...firstWeekData.tasks.map((t) => ({ ...t, timeline_category: "first_week" } as TaskTemplate & { timeline_category: string })),
    ...firstMonthData.tasks.map((t) => ({ ...t, timeline_category: "first_month" } as TaskTemplate & { timeline_category: string })),
    ...ongoingData.tasks.map((t) => ({ ...t, timeline_category: "ongoing" } as TaskTemplate & { timeline_category: string })),
  ];

  // Filter templates by grief stage
  const filteredTemplates = allTemplates.filter((t) =>
    t.stages && t.stages.includes(griefStage)
  );

  const regularTasks: Task[] = filteredTemplates.map((template) => ({
    id: template.id,
    user_id: "demo-user-123",
    template_id: template.id,
    title: template.title,
    description: template.description,
    timeline_category: template.timeline_category as TimelineCategory,
    task_type: template.task_type as TaskType,
    status: "pending" as const,
    priority: template.priority,
    due_date: null,
    completed_at: null,
    notes: null,
    why_it_matters: template.why_it_matters,
    documents_needed: template.documents_needed,
    tips: template.tips,
    is_paperwork_task: template.is_paperwork_task,
    paperwork_wizard_id: template.paperwork_wizard_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Add discovery tasks for areas where user has 'unknown' status
  const discoveryTasks: Task[] = [];
  const discoveryTemplates = discoveryData.tasks as DiscoveryTaskTemplate[];

  for (const template of discoveryTemplates) {
    const triggerArea = template.triggers_on_unknown as keyof KnowledgeStatusMap;
    if (knowledgeStatus[triggerArea] === "unknown") {
      if (template.stages && template.stages.includes(griefStage)) {
        discoveryTasks.push({
          id: template.id,
          user_id: "demo-user-123",
          template_id: template.id,
          title: template.title,
          description: template.description,
          timeline_category: "discovery" as TimelineCategory,
          task_type: template.task_type as TaskType,
          status: "pending" as const,
          priority: 0,
          due_date: null,
          completed_at: null,
          notes: null,
          why_it_matters: template.why_it_matters,
          documents_needed: template.documents_needed,
          tips: template.tips,
          is_paperwork_task: template.is_paperwork_task,
          paperwork_wizard_id: template.paperwork_wizard_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  return [...discoveryTasks, ...regularTasks];
}
