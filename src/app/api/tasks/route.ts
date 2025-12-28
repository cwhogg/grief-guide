import { NextResponse } from "next/server";
import type { GriefStage, KnowledgeStatus } from "@/lib/supabase/types";

// Import task templates - organized by grief stage
// Note: first-week.json and first-month.json have been consolidated into immediate.json and ongoing.json
import anticipatingData from "../../../../docs/knowledge/tasks/anticipating.json";
import immediateData from "../../../../docs/knowledge/tasks/immediate.json";
import ongoingData from "../../../../docs/knowledge/tasks/ongoing.json";
import discoveryData from "../../../../docs/knowledge/tasks/discovery.json";

// Demo mode - generate tasks from templates
const DEMO_MODE = true;

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

interface DemoTask {
  id: string;
  user_id: string;
  template_id: string;
  title: string;
  description: string | null;
  timeline_category: string;
  task_type: string;
  status: string;
  priority: number;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  why_it_matters: string | null;
  documents_needed: string[] | null;
  tips: string[] | null;
  is_paperwork_task: boolean;
  paperwork_wizard_id: string | null;
  is_discovery_task?: boolean;
  who_to_ask?: string[] | null;
  what_to_ask?: string[] | null;
  where_to_look?: string[] | null;
  if_none?: string | null;
  created_at: string;
  updated_at: string;
}

// Knowledge status for each area
interface KnowledgeStatusMap {
  will: KnowledgeStatus;
  trust: KnowledgeStatus;
  property: KnowledgeStatus;
  accounts: KnowledgeStatus;
  insurance: KnowledgeStatus;
}

// In-memory store for demo mode task state changes
const taskStateStore = new Map<string, Partial<DemoTask>>();

// Default knowledge status - 'unknown' for everything
const defaultKnowledgeStatus: KnowledgeStatusMap = {
  will: "unknown",
  trust: "unknown",
  property: "unknown",
  accounts: "unknown",
  insurance: "unknown",
};

function generateTasksFromTemplates(
  griefStage: GriefStage = "immediate",
  knowledgeStatus: KnowledgeStatusMap = defaultKnowledgeStatus
): DemoTask[] {
  // Map grief stages to timeline categories for tasks
  // anticipating stage -> anticipating timeline
  // immediate stage -> immediate timeline
  // navigating stage -> ongoing timeline
  const allTemplates: (TaskTemplate & { timeline_category: string })[] = [
    ...anticipatingData.tasks.map((t) => ({ ...t, timeline_category: "anticipating" } as TaskTemplate & { timeline_category: string })),
    ...immediateData.tasks.map((t) => ({ ...t, timeline_category: "immediate" } as TaskTemplate & { timeline_category: string })),
    ...ongoingData.tasks.map((t) => ({ ...t, timeline_category: "ongoing" } as TaskTemplate & { timeline_category: string })),
  ];

  // Filter templates by grief stage
  const filteredTemplates = allTemplates.filter((t) =>
    t.stages && t.stages.includes(griefStage)
  );

  const regularTasks: DemoTask[] = filteredTemplates.map((template) => {
    const storedState = taskStateStore.get(template.id) || {};
    return {
      id: template.id,
      user_id: "demo-user-123",
      template_id: template.id,
      title: template.title,
      description: template.description,
      timeline_category: template.timeline_category,
      task_type: template.task_type,
      status: storedState.status || "pending",
      priority: template.priority,
      due_date: null,
      completed_at: storedState.completed_at || null,
      notes: storedState.notes || null,
      why_it_matters: template.why_it_matters,
      documents_needed: template.documents_needed,
      tips: template.tips,
      is_paperwork_task: template.is_paperwork_task,
      paperwork_wizard_id: template.paperwork_wizard_id,
      created_at: new Date().toISOString(),
      updated_at: storedState.updated_at || new Date().toISOString(),
    };
  });

  // Add discovery tasks for areas where user has 'unknown' status
  // Discovery tasks slot in around "Find important papers" (priority 5-6)
  // They help users find specific info they don't know about
  const discoveryTasks: DemoTask[] = [];
  const discoveryTemplates = discoveryData.tasks as DiscoveryTaskTemplate[];

  for (const template of discoveryTemplates) {
    // Check if this discovery task should be triggered
    const triggerArea = template.triggers_on_unknown as keyof KnowledgeStatusMap;
    if (knowledgeStatus[triggerArea] === "unknown") {
      // Also check if it applies to this grief stage
      if (template.stages && template.stages.includes(griefStage)) {
        const storedState = taskStateStore.get(template.id) || {};
        // Discovery tasks should come after the first critical tasks (1-4) but around
        // the same priority as "Find important papers" (5) and "Figure out will" (6)
        // Base priority of 5, with template priority adding minor ordering within discovery tasks
        const discoveryPriority = 5 + (template.priority || 1) * 0.1;
        discoveryTasks.push({
          id: template.id,
          user_id: "demo-user-123",
          template_id: template.id,
          title: template.title,
          description: template.description,
          timeline_category: "discovery",
          task_type: template.task_type,
          status: storedState.status || "pending",
          priority: discoveryPriority,
          due_date: null,
          completed_at: storedState.completed_at || null,
          notes: storedState.notes || null,
          why_it_matters: template.why_it_matters,
          documents_needed: template.documents_needed,
          tips: template.tips,
          is_paperwork_task: template.is_paperwork_task,
          paperwork_wizard_id: template.paperwork_wizard_id,
          is_discovery_task: true,
          who_to_ask: template.who_to_ask,
          what_to_ask: template.what_to_ask,
          where_to_look: template.where_to_look,
          if_none: template.if_none,
          created_at: new Date().toISOString(),
          updated_at: storedState.updated_at || new Date().toISOString(),
        });
      }
    }
  }

  // Combine all tasks and sort by priority (lower number = higher priority)
  const allTasks = [...regularTasks, ...discoveryTasks];
  allTasks.sort((a, b) => a.priority - b.priority);

  return allTasks;
}

// GET - Fetch all tasks
export async function GET(request: Request) {
  try {
    if (DEMO_MODE) {
      // Get grief stage and knowledge status from query params
      const { searchParams } = new URL(request.url);
      const griefStage = (searchParams.get("stage") as GriefStage) || "immediate";

      // Parse knowledge status from query params (default to 'unknown')
      const knowledgeStatus: KnowledgeStatusMap = {
        will: (searchParams.get("knows_will") as KnowledgeStatus) || "unknown",
        trust: (searchParams.get("knows_trust") as KnowledgeStatus) || "unknown",
        property: (searchParams.get("knows_property") as KnowledgeStatus) || "unknown",
        accounts: (searchParams.get("knows_accounts") as KnowledgeStatus) || "unknown",
        insurance: (searchParams.get("knows_insurance") as KnowledgeStatus) || "unknown",
      };

      const tasks = generateTasksFromTemplates(griefStage, knowledgeStatus);
      return NextResponse.json({ tasks });
    }

    // Original Supabase code would go here for non-demo mode
    return NextResponse.json({ tasks: [] });
  } catch (error) {
    console.error("Tasks GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update a task
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    if (DEMO_MODE) {
      // Store state changes in memory
      const existingState = taskStateStore.get(id) || {};

      const newState = {
        ...existingState,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (updates.status === "completed") {
        newState.completed_at = new Date().toISOString();
      } else if (updates.status && updates.status !== "completed") {
        newState.completed_at = null;
      }

      taskStateStore.set(id, newState);

      // Return the updated task
      const tasks = generateTasksFromTemplates();
      const task = tasks.find((t) => t.id === id);

      return NextResponse.json({ task });
    }

    return NextResponse.json({ error: "Not implemented" }, { status: 501 });
  } catch (error) {
    console.error("Tasks PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new task (not needed for demo, but stub it)
export async function POST(request: Request) {
  try {
    if (DEMO_MODE) {
      return NextResponse.json(
        { error: "Creating custom tasks is not available in demo mode" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Not implemented" }, { status: 501 });
  } catch (error) {
    console.error("Tasks POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a task (not needed for demo, but stub it)
export async function DELETE(request: Request) {
  try {
    if (DEMO_MODE) {
      return NextResponse.json(
        { error: "Deleting tasks is not available in demo mode" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Not implemented" }, { status: 501 });
  } catch (error) {
    console.error("Tasks DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
