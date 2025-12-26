"use client";

import { useState } from "react";
import type { Task, TaskStatus } from "@/lib/supabase/types";

interface ChatTaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  onTellMeMore: (task: Task) => void;
  isCompleted?: boolean;
}

const STATUS_BADGE: Record<TaskStatus, { label: string; className: string } | null> = {
  pending: null, // Don't show badge for pending
  in_progress: { label: "In progress", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Done", className: "bg-green-100 text-green-700" },
  blocked: { label: "Stuck", className: "bg-orange-100 text-orange-700" },
  skipped: { label: "Skipped", className: "bg-stone-100 text-stone-500" },
};

export function ChatTaskCard({
  task,
  onStatusChange,
  onTellMeMore,
  isCompleted: propCompleted,
}: ChatTaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const isCompleted = propCompleted ?? (task.status === "completed" || task.status === "skipped");
  const statusBadge = STATUS_BADGE[task.status];

  const handleDone = async () => {
    setIsUpdating(true);
    try {
      await onStatusChange(task.id, "completed");
      setJustCompleted(true);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkip = async () => {
    setIsUpdating(true);
    try {
      await onStatusChange(task.id, "skipped");
      setJustCompleted(true);
    } finally {
      setIsUpdating(false);
    }
  };

  // Truncate description to ~2 lines
  const truncatedDescription = task.description
    ? task.description.length > 100
      ? task.description.slice(0, 100) + "..."
      : task.description
    : null;

  if (justCompleted) {
    return (
      <div className="my-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-2 text-green-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">{task.status === "skipped" ? "Skipped" : "Done"}</span>
          <span className="text-green-600">— {task.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`my-2 bg-white border rounded-xl overflow-hidden transition-opacity ${
        isCompleted ? "border-stone-200 opacity-60" : "border-stone-200 shadow-sm"
      }`}
    >
      {/* Task content */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title with optional status badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-medium ${isCompleted ? "text-stone-500 line-through" : "text-stone-900"}`}>
                {task.title}
              </h4>
              {statusBadge && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
              )}
            </div>

            {/* Description - 2 lines max */}
            {truncatedDescription && (
              <p className="text-sm text-stone-500 mt-1 line-clamp-2">
                {truncatedDescription}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons - only show if not completed */}
      {!isCompleted && (
        <div className="px-4 py-2 bg-stone-50 border-t border-stone-100 flex items-center gap-2">
          <button
            onClick={handleDone}
            disabled={isUpdating}
            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Done
          </button>
          <button
            onClick={handleSkip}
            disabled={isUpdating}
            className="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => onTellMeMore(task)}
            disabled={isUpdating}
            className="px-3 py-1.5 text-sm text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
          >
            Tell me more
          </button>
        </div>
      )}
    </div>
  );
}

// Parser to extract task references from message content
// Format: [task:task_id] or [[task:task_id]]
export function parseTaskReferences(content: string): {
  segments: Array<{ type: "text" | "task"; content: string; taskId?: string }>;
  taskIds: string[];
} {
  const taskPattern = /\[\[?task:([a-zA-Z0-9_-]+)\]\]?/g;
  const segments: Array<{ type: "text" | "task"; content: string; taskId?: string }> = [];
  const taskIds: string[] = [];

  let lastIndex = 0;
  let match;

  while ((match = taskPattern.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) {
        segments.push({ type: "text", content: text });
      }
    }

    // Add the task reference
    const taskId = match[1];
    taskIds.push(taskId);
    segments.push({ type: "task", content: match[0], taskId });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      segments.push({ type: "text", content: text });
    }
  }

  // If no tasks found, return the whole content as text
  if (segments.length === 0) {
    segments.push({ type: "text", content });
  }

  return { segments, taskIds };
}

// Helper to check if a message contains task references
export function hasTaskReferences(content: string): boolean {
  return /\[\[?task:[a-zA-Z0-9_-]+\]\]?/.test(content);
}
