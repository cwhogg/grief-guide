import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TaskUpdate } from "@/lib/supabase/types";

// GET - Fetch all tasks for the current user
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Tasks fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch tasks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ tasks });
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
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates }: { id: string } & TaskUpdate = body;

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // If marking as completed, set completed_at
    if (updates.status === "completed") {
      updates.completed_at = new Date().toISOString();
    } else if (updates.status) {
      updates.completed_at = null;
    }

    updates.updated_at = new Date().toISOString();

    const { data: task, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Task update error:", error);
      return NextResponse.json(
        { error: "Failed to update task" },
        { status: 500 }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Tasks PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new task
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.title || !body.timeline_category || !body.task_type) {
      return NextResponse.json(
        { error: "Title, timeline_category, and task_type are required" },
        { status: 400 }
      );
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: body.title,
        description: body.description || null,
        timeline_category: body.timeline_category,
        task_type: body.task_type,
        priority: body.priority || 50,
        status: "pending",
        notes: body.notes || null,
        why_it_matters: body.why_it_matters || null,
        documents_needed: body.documents_needed || null,
        tips: body.tips || null,
        is_paperwork_task: body.is_paperwork_task || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Task create error:", error);
      return NextResponse.json(
        { error: "Failed to create task" },
        { status: 500 }
      );
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Tasks POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a task
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Task delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete task" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tasks DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
