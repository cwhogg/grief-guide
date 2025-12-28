"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { PaperworkWizard } from "@/components/tasks/PaperworkWizard";
import type { Task } from "@/lib/supabase/types";
import type { PaperworkGuide, WizardProgress } from "@/lib/paperwork/types";

// Import paperwork guides
import socialSecurityGuide from "../../../../docs/knowledge/paperwork/social-security.json";

// Map of paperwork wizard IDs to their guides
const PAPERWORK_GUIDES: Record<string, PaperworkGuide> = {
  "social-security-survivor-benefits": socialSecurityGuide as PaperworkGuide,
};

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const { user, profile, isLoading: userLoading, initialize } = useUser();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wizardProgress, setWizardProgress] = useState<WizardProgress | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [userLoading, user, router]);

  const fetchTask = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks");
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }
      const data = await response.json();
      const foundTask = data.tasks.find((t: Task) => t.id === taskId);
      if (!foundTask) {
        setError("Task not found");
      } else {
        setTask(foundTask);
        // Load wizard progress from localStorage
        const savedProgress = localStorage.getItem(`paperwork-progress-${taskId}`);
        if (savedProgress) {
          setWizardProgress(JSON.parse(savedProgress));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load task");
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (user) {
      fetchTask();
    }
  }, [user, fetchTask]);

  const handleTaskComplete = async () => {
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: "completed" }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      router.push("/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete task");
    }
  };

  const handleStatusChange = async (status: Task["status"]) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      const data = await response.json();
      setTask(data.task);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--foreground-muted)]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error || !task) {
    return (
      <main className="min-h-screen min-h-[100dvh] bg-[var(--background)]">
        <div className="max-w-4xl mx-auto px-5 py-8">
          <div className="card p-8 text-center">
            <h1 className="text-xl font-semibold text-[var(--gray-900)]">
              {error || "Task not found"}
            </h1>
            <p className="text-[var(--gray-500)] mt-2">
              We couldn&apos;t find this task. It may have been deleted.
            </p>
            <Link
              href="/tasks"
              className="btn btn-primary inline-block mt-4"
            >
              Back to Tasks
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Check if this is a paperwork task with a guide
  const paperworkGuide = task.is_paperwork_task && task.paperwork_wizard_id
    ? PAPERWORK_GUIDES[task.paperwork_wizard_id]
    : null;

  return (
    <main className="min-h-screen min-h-[100dvh] bg-[var(--background)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--gray-200)] safe-area-top">
        <div className="max-w-4xl mx-auto px-5 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/tasks" className="text-[var(--primary-600)] hover:text-[var(--primary-700)]">
              Tasks
            </Link>
            <svg
              className="w-4 h-4 text-[var(--gray-400)]"
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
            <span className="text-[var(--gray-600)] truncate">{task.title}</span>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-5 py-8">
        {paperworkGuide ? (
          // Render the paperwork wizard
          <PaperworkWizard
            guide={paperworkGuide}
            taskId={taskId}
            onComplete={handleTaskComplete}
            initialProgress={wizardProgress || undefined}
          />
        ) : (
          // Render regular task detail view
          <TaskDetailView
            task={task}
            onStatusChange={handleStatusChange}
            onComplete={handleTaskComplete}
          />
        )}
      </div>
    </main>
  );
}

function TaskDetailView({
  task,
  onStatusChange,
  onComplete,
}: {
  task: Task;
  onStatusChange: (status: Task["status"]) => Promise<void>;
  onComplete: () => Promise<void>;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (status: Task["status"]) => {
    setIsUpdating(true);
    try {
      await onStatusChange(status);
    } finally {
      setIsUpdating(false);
    }
  };

  const statusConfig: Record<Task["status"], { label: string; color: string }> = {
    pending: { label: "Not Started", color: "bg-[var(--gray-100)] text-[var(--gray-700)]" },
    in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
    completed: { label: "Completed", color: "bg-[var(--primary-100)] text-[var(--primary-700)]" },
    blocked: { label: "Blocked", color: "bg-[var(--accent-100)] text-[var(--accent-700)]" },
    skipped: { label: "Not Applicable", color: "bg-[var(--gray-100)] text-[var(--gray-500)]" },
  };

  return (
    <div className="space-y-6">
      {/* Task header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  statusConfig[task.status].color
                }`}
              >
                {statusConfig[task.status].label}
              </span>
              <span className="text-xs text-[var(--gray-500)] capitalize">
                {task.task_type}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-[var(--gray-900)]">
              {task.title}
            </h1>
            {task.description && (
              <p className="text-[var(--gray-600)] mt-2">{task.description}</p>
            )}
          </div>
        </div>

        {task.due_date && (
          <div className="mt-4 flex items-center gap-2 text-sm text-[var(--gray-500)]">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Why it matters */}
      {task.why_it_matters && (
        <div className="bg-[var(--accent-50)] rounded-[var(--radius-lg)] border border-[var(--accent-200)] p-6">
          <h2 className="font-semibold text-[var(--accent-900)] mb-2">
            Why This Matters
          </h2>
          <p className="text-[var(--accent-800)]">{task.why_it_matters}</p>
        </div>
      )}

      {/* Documents needed */}
      {task.documents_needed && task.documents_needed.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-[var(--gray-900)] mb-3">
            What You&apos;ll Need
          </h2>
          <ul className="space-y-2">
            {task.documents_needed.map((doc, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-[var(--gray-600)]"
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {doc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tips */}
      {task.tips && task.tips.length > 0 && (
        <div className="bg-blue-50 rounded-[var(--radius-lg)] border border-blue-200 p-6">
          <h2 className="font-semibold text-blue-900 mb-3">Tips</h2>
          <ul className="space-y-2">
            {task.tips.map((tip, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-blue-700"
              >
                <svg
                  className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
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

      {/* Notes */}
      {task.notes && (
        <div className="card">
          <h2 className="font-semibold text-[var(--gray-900)] mb-2">Your Notes</h2>
          <p className="text-[var(--gray-600)]">{task.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="card">
        <h2 className="font-semibold text-[var(--gray-900)] mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {task.status !== "completed" && (
            <button
              onClick={() => handleStatusChange("completed")}
              disabled={isUpdating}
              className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-[var(--radius-md)] hover:bg-[var(--primary-700)] disabled:opacity-50 min-h-[44px]"
            >
              Mark Complete
            </button>
          )}
          {task.status !== "in_progress" && task.status !== "completed" && (
            <button
              onClick={() => handleStatusChange("in_progress")}
              disabled={isUpdating}
              className="px-4 py-2 bg-blue-600 text-white rounded-[var(--radius-md)] hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
            >
              Start Task
            </button>
          )}
          {task.status !== "blocked" && task.status !== "completed" && (
            <button
              onClick={() => handleStatusChange("blocked")}
              disabled={isUpdating}
              className="px-4 py-2 border border-[var(--accent-300)] text-[var(--accent-700)] rounded-[var(--radius-md)] hover:bg-[var(--accent-50)] disabled:opacity-50 min-h-[44px]"
            >
              Mark Blocked
            </button>
          )}
          {task.status !== "skipped" && (
            <button
              onClick={() => handleStatusChange("skipped")}
              disabled={isUpdating}
              className="px-4 py-2 border border-[var(--gray-300)] text-[var(--gray-600)] rounded-[var(--radius-md)] hover:bg-[var(--gray-50)] disabled:opacity-50 min-h-[44px]"
            >
              Not Applicable
            </button>
          )}
          {task.status === "completed" && (
            <button
              onClick={() => handleStatusChange("pending")}
              disabled={isUpdating}
              className="px-4 py-2 border border-[var(--gray-300)] text-[var(--gray-600)] rounded-[var(--radius-md)] hover:bg-[var(--gray-50)] disabled:opacity-50 min-h-[44px]"
            >
              Reopen Task
            </button>
          )}
        </div>
      </div>

      {/* Back link */}
      <div className="text-center">
        <Link
          href="/tasks"
          className="text-[var(--primary-600)] hover:text-[var(--primary-700)] text-sm"
        >
          &larr; Back to all tasks
        </Link>
      </div>
    </div>
  );
}
