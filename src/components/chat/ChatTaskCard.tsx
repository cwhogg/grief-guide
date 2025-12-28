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
  pending: null,
  in_progress: { label: "In progress", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Done", className: "bg-[var(--primary-100)] text-[var(--primary-700)]" },
  blocked: { label: "Stuck", className: "bg-[var(--accent-400)]/20 text-[var(--accent-600)]" },
  skipped: { label: "Skipped", className: "bg-[var(--gray-100)] text-[var(--gray-500)]" },
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

  const truncatedDescription = task.description
    ? task.description.length > 80
      ? task.description.slice(0, 80) + "..."
      : task.description
    : null;

  if (justCompleted) {
    return (
      <div className="my-2 px-4 py-3 bg-[var(--primary-50)] border border-[var(--primary-200)] rounded-[var(--radius-lg)]">
        <div className="flex items-center gap-2 text-[var(--primary-700)]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">{task.status === "skipped" ? "Skipped" : "Done"}</span>
          <span className="text-[var(--primary-600)]">— {task.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`my-2 bg-white border rounded-[var(--radius-lg)] overflow-hidden transition-opacity ${
        isCompleted ? "border-[var(--gray-200)] opacity-60" : "border-[var(--primary-200)] shadow-sm"
      }`}
    >
      {/* Task header with icon */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Task icon */}
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--primary-100)] flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-[var(--primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            {/* Title with optional status badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-medium ${isCompleted ? "text-[var(--gray-500)] line-through" : "text-[var(--gray-900)]"}`}>
                {task.title}
              </h4>
              {statusBadge && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
              )}
            </div>

            {/* Description */}
            {truncatedDescription && (
              <p className="text-sm text-[var(--gray-500)] mt-1">
                {truncatedDescription}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons - RCS style, inside card */}
      {!isCompleted && (
        <div className="px-3 py-2 border-t border-[var(--gray-100)] flex flex-wrap gap-2">
          <button
            onClick={() => onTellMeMore(task)}
            disabled={isUpdating}
            className="flex-1 min-w-[100px] px-4 py-2.5 text-sm font-medium text-[var(--accent-600)] bg-[var(--accent-400)]/10 border border-[var(--accent-400)]/30 rounded-[var(--radius-md)] hover:bg-[var(--accent-400)]/20 disabled:opacity-50 transition-colors"
          >
            Walk me through it
          </button>
          <button
            onClick={handleDone}
            disabled={isUpdating}
            className="px-4 py-2.5 text-sm font-medium text-[var(--primary-700)] bg-[var(--primary-50)] border border-[var(--primary-200)] rounded-[var(--radius-md)] hover:bg-[var(--primary-100)] disabled:opacity-50 transition-colors"
          >
            Done
          </button>
          <button
            onClick={handleSkip}
            disabled={isUpdating}
            className="px-4 py-2.5 text-sm text-[var(--gray-500)] border border-[var(--gray-200)] rounded-[var(--radius-md)] hover:bg-[var(--gray-50)] disabled:opacity-50 transition-colors"
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

// Types for message actions
export interface MessageAction {
  label: string;
  type: "message" | "action";
  value?: string; // For message type - the message to send
  taskId?: string; // For action type
  action?: "complete" | "skip" | "details"; // For action type
  primary?: boolean;
}

// Parser to extract task references and action buttons from message content
// Formats:
// - [task:task_id] - Embed a task card
// - [action:label|type|value] - Add an action button
export function parseMessageContent(content: string): {
  segments: Array<{ type: "text" | "task"; content: string; taskId?: string }>;
  taskIds: string[];
  actions: MessageAction[];
} {
  const taskPattern = /\[\[?task:([a-zA-Z0-9_-]+)\]\]?/g;
  const actionPattern = /\[action:([^\]]+)\]/g;

  const segments: Array<{ type: "text" | "task"; content: string; taskId?: string }> = [];
  const taskIds: string[] = [];
  const actions: MessageAction[] = [];

  // First, extract actions (they appear at the end usually)
  let contentWithoutActions = content;
  let actionMatch;
  while ((actionMatch = actionPattern.exec(content)) !== null) {
    const actionStr = actionMatch[1];
    const parts = actionStr.split("|");
    if (parts.length >= 2) {
      const action: MessageAction = {
        label: parts[0],
        type: parts[1] as "message" | "action",
        value: parts[2],
        taskId: parts[3],
        action: parts[4] as "complete" | "skip" | "details",
        primary: parts[5] === "primary",
      };
      actions.push(action);
    }
    contentWithoutActions = contentWithoutActions.replace(actionMatch[0], "").trim();
  }

  // Then parse task references from the remaining content
  let lastIndex = 0;
  let match;

  while ((match = taskPattern.exec(contentWithoutActions)) !== null) {
    if (match.index > lastIndex) {
      const text = contentWithoutActions.slice(lastIndex, match.index).trim();
      if (text) {
        segments.push({ type: "text", content: text });
      }
    }

    const taskId = match[1];
    taskIds.push(taskId);
    segments.push({ type: "task", content: match[0], taskId });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < contentWithoutActions.length) {
    const text = contentWithoutActions.slice(lastIndex).trim();
    if (text) {
      segments.push({ type: "text", content: text });
    }
  }

  if (segments.length === 0 && contentWithoutActions.trim()) {
    segments.push({ type: "text", content: contentWithoutActions.trim() });
  }

  return { segments, taskIds, actions };
}

// Legacy parser for backwards compatibility
export function parseTaskReferences(content: string): {
  segments: Array<{ type: "text" | "task"; content: string; taskId?: string }>;
  taskIds: string[];
} {
  const result = parseMessageContent(content);
  return { segments: result.segments, taskIds: result.taskIds };
}

// Helper to check if a message contains task references
export function hasTaskReferences(content: string): boolean {
  return /\[\[?task:[a-zA-Z0-9_-]+\]\]?/.test(content);
}

// Message action buttons component
interface MessageActionsProps {
  actions: MessageAction[];
  onSendMessage: (message: string) => void;
  onTaskAction?: (taskId: string, action: "complete" | "skip" | "details") => void;
}

export function MessageActions({ actions, onSendMessage, onTaskAction }: MessageActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {actions.map((action, i) => {
        const isPrimary = action.primary || i === 0;

        const handleClick = () => {
          if (action.type === "message" && action.value) {
            onSendMessage(action.value);
          } else if (action.type === "action" && action.taskId && action.action && onTaskAction) {
            onTaskAction(action.taskId, action.action);
          }
        };

        return (
          <button
            key={i}
            onClick={handleClick}
            className={`px-4 py-2.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors min-h-[44px] ${
              isPrimary
                ? "bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)]"
                : "border border-[var(--gray-200)] text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
            }`}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

// Generate contextual actions based on message content
export function generateContextualActions(content: string, taskId?: string): MessageAction[] {
  const lowerContent = content.toLowerCase();
  const actions: MessageAction[] = [];

  // If message mentions a task, add task-specific actions
  if (taskId) {
    actions.push(
      { label: "Walk me through it", type: "message", value: `Walk me through ${taskId}`, primary: true },
      { label: "Done", type: "action", taskId, action: "complete" },
      { label: "Skip", type: "action", taskId, action: "skip" }
    );
    return actions;
  }

  // Emotional content
  if (lowerContent.includes("hard") || lowerContent.includes("difficult") || lowerContent.includes("overwhelm")) {
    actions.push(
      { label: "I need to keep talking", type: "message", value: "I just need to talk", primary: true },
      { label: "I'm okay, back to tasks", type: "message", value: "I'm ready to look at practical stuff" }
    );
    return actions;
  }

  // Task-related content
  if (lowerContent.includes("death certificate") || lowerContent.includes("funeral") || lowerContent.includes("will")) {
    actions.push(
      { label: "Tell me more", type: "message", value: "Tell me more about this", primary: true },
      { label: "What's next?", type: "message", value: "What should I focus on next?" }
    );
    return actions;
  }

  // Default helpful actions
  if (content.includes("?")) {
    actions.push(
      { label: "Yes", type: "message", value: "Yes", primary: true },
      { label: "Not right now", type: "message", value: "Not right now" }
    );
  }

  return actions;
}
