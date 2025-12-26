import { NextResponse } from "next/server";
import type { GriefStage } from "@/lib/supabase/types";

// Import task templates
import anticipatingData from "../../../../docs/knowledge/tasks/anticipating.json";
import immediateData from "../../../../docs/knowledge/tasks/immediate.json";
import firstWeekData from "../../../../docs/knowledge/tasks/first-week.json";
import firstMonthData from "../../../../docs/knowledge/tasks/first-month.json";
import ongoingData from "../../../../docs/knowledge/tasks/ongoing.json";

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
  created_at: string;
  updated_at: string;
}

// In-memory store for demo mode task state changes
const taskStateStore = new Map<string, Partial<DemoTask>>();

function generateTasksFromTemplates(griefStage: GriefStage = "immediate"): DemoTask[] {
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

  return filteredTemplates.map((template) => {
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
}

// GET - Fetch all tasks
export async function GET(request: Request) {
  try {
    if (DEMO_MODE) {
      // Get grief stage from query params
      const { searchParams } = new URL(request.url);
      const griefStage = (searchParams.get("stage") as GriefStage) || "immediate";

      const tasks = generateTasksFromTemplates(griefStage);
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
