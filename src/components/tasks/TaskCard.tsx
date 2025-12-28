"use client";

import { useState } from "react";
import type { Task, TaskStatus } from "@/lib/supabase/types";
import Link from "next/link";

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  onNotesChange: (taskId: string, notes: string) => Promise<void>;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: {
    label: "Not Started",
    color: "text-[var(--gray-600)]",
    bgColor: "bg-[var(--gray-100)]",
  },
  in_progress: {
    label: "In Progress",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  completed: {
    label: "Completed",
    color: "text-[var(--primary-700)]",
    bgColor: "bg-[var(--primary-50)]",
  },
  blocked: {
    label: "Blocked",
    color: "text-[var(--accent-600)]",
    bgColor: "bg-[var(--accent-400)]/20",
  },
  skipped: {
    label: "Not Applicable",
    color: "text-[var(--gray-500)]",
    bgColor: "bg-[var(--gray-50)]",
  },
};

const TASK_TYPE_ICONS: Record<string, string> = {
  paperwork: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  legal: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
  financial: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  notifications: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  logistics: "M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2",
};

export function TaskCard({ task, onStatusChange, onNotesChange }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [notes, setNotes] = useState(task.notes || "");
  const [showNotesInput, setShowNotesInput] = useState(false);

  const statusConfig = STATUS_CONFIG[task.status];

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setIsUpdating(true);
    try {
      await onStatusChange(task.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsUpdating(true);
    try {
      await onNotesChange(task.id, notes);
      setShowNotesInput(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const isCompleted = task.status === "completed" || task.status === "skipped";

  return (
    <div
      className={`bg-white rounded-[var(--radius-lg)] border transition-all ${
        isCompleted
          ? "border-[var(--gray-200)] opacity-75"
          : "border-[var(--gray-200)] hover:border-[var(--gray-300)] hover:shadow-sm"
      }`}
    >
      {/* Header row - always visible */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox/Status indicator */}
          <button
            onClick={() =>
              handleStatusChange(
                task.status === "completed" ? "pending" : "completed"
              )
            }
            disabled={isUpdating}
            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 transition-colors ${
              task.status === "completed"
                ? "bg-[var(--primary-600)] border-[var(--primary-600)]"
                : task.status === "skipped"
                ? "bg-[var(--gray-400)] border-[var(--gray-400)]"
                : "border-[var(--gray-300)] hover:border-[var(--primary-500)]"
            } ${isUpdating ? "opacity-50" : ""}`}
          >
            {(task.status === "completed" || task.status === "skipped") && (
              <svg
                className="w-full h-full text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>

          {/* Task content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <Link
                  href={`/tasks/${task.id}`}
                  className={`font-medium hover:underline ${
                    isCompleted
                      ? "text-[var(--gray-500)] line-through"
                      : "text-[var(--gray-900)]"
                  }`}
                >
                  {task.title}
                </Link>
                {task.description && !isExpanded && (
                  <p className="text-sm text-[var(--gray-500)] line-clamp-1 mt-0.5">
                    {task.description}
                  </p>
                )}
              </div>

              {/* Task type icon and expand button */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </span>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 text-[var(--gray-400)] hover:text-[var(--gray-600)] transition-colors"
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Task type badge */}
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-xs text-[var(--gray-500)]">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={TASK_TYPE_ICONS[task.task_type] || TASK_TYPE_ICONS.logistics}
                  />
                </svg>
                <span className="capitalize">{task.task_type}</span>
              </span>
              {task.due_date && (
                <span className="text-xs text-[var(--gray-400)]">
                  Due: {new Date(task.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-[var(--gray-100)]">
          <div className="pt-4 space-y-4">
            {/* Full description */}
            {task.description && (
              <div>
                <h4 className="text-sm font-medium text-[var(--gray-700)] mb-1">
                  Description
                </h4>
                <p className="text-sm text-[var(--gray-600)]">{task.description}</p>
              </div>
            )}

            {/* Why it matters */}
            {task.why_it_matters && (
              <div className="bg-[var(--primary-50)] rounded-[var(--radius-md)] p-3">
                <h4 className="text-sm font-medium text-[var(--primary-700)] mb-1">
                  Why this matters
                </h4>
                <p className="text-sm text-[var(--primary-600)]">{task.why_it_matters}</p>
              </div>
            )}

            {/* Documents needed */}
            {task.documents_needed && task.documents_needed.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-[var(--gray-700)] mb-2">
                  What you&apos;ll need
                </h4>
                <ul className="space-y-1">
                  {task.documents_needed.map((doc, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-[var(--gray-600)]"
                    >
                      <svg
                        className="w-4 h-4 mt-0.5 text-[var(--gray-400)] flex-shrink-0"
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
              <div className="bg-blue-50 rounded-[var(--radius-md)] p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Tips</h4>
                <ul className="space-y-1">
                  {task.tips.map((tip, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-blue-700"
                    >
                      <svg
                        className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0"
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

            {/* Notes section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-[var(--gray-700)]">
                  Your notes
                </h4>
                {!showNotesInput && (
                  <button
                    onClick={() => setShowNotesInput(true)}
                    className="text-sm text-[var(--primary-600)] hover:text-[var(--primary-700)]"
                  >
                    {task.notes ? "Edit" : "Add note"}
                  </button>
                )}
              </div>
              {showNotesInput ? (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this task..."
                    className="input text-sm"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveNotes}
                      disabled={isUpdating}
                      className="px-3 py-1.5 bg-[var(--accent-500)] text-white text-sm rounded-[var(--radius-md)] hover:bg-[var(--accent-600)] disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setNotes(task.notes || "");
                        setShowNotesInput(false);
                      }}
                      className="px-3 py-1.5 text-[var(--gray-600)] text-sm hover:text-[var(--gray-900)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : task.notes ? (
                <p className="text-sm text-[var(--gray-600)] bg-[var(--gray-50)] rounded-[var(--radius-md)] p-2">
                  {task.notes}
                </p>
              ) : (
                <p className="text-sm text-[var(--gray-400)] italic">No notes yet</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--gray-100)]">
              {task.status !== "completed" && (
                <button
                  onClick={() => handleStatusChange("completed")}
                  disabled={isUpdating}
                  className="px-3 py-1.5 bg-[var(--primary-600)] text-white text-sm rounded-[var(--radius-md)] hover:bg-[var(--primary-700)] disabled:opacity-50 min-h-[36px]"
                >
                  Mark Complete
                </button>
              )}
              {task.status !== "in_progress" && task.status !== "completed" && (
                <button
                  onClick={() => handleStatusChange("in_progress")}
                  disabled={isUpdating}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-[var(--radius-md)] hover:bg-blue-700 disabled:opacity-50 min-h-[36px]"
                >
                  Start Task
                </button>
              )}
              {task.status !== "blocked" && task.status !== "completed" && (
                <button
                  onClick={() => handleStatusChange("blocked")}
                  disabled={isUpdating}
                  className="px-3 py-1.5 border border-[var(--accent-400)] text-[var(--accent-600)] text-sm rounded-[var(--radius-md)] hover:bg-[var(--accent-400)]/10 disabled:opacity-50 min-h-[36px]"
                >
                  Mark Blocked
                </button>
              )}
              {task.status !== "skipped" && (
                <button
                  onClick={() => handleStatusChange("skipped")}
                  disabled={isUpdating}
                  className="px-3 py-1.5 border border-[var(--gray-300)] text-[var(--gray-600)] text-sm rounded-[var(--radius-md)] hover:bg-[var(--gray-50)] disabled:opacity-50 min-h-[36px]"
                >
                  Not Applicable
                </button>
              )}
              {task.status === "completed" && (
                <button
                  onClick={() => handleStatusChange("pending")}
                  disabled={isUpdating}
                  className="px-3 py-1.5 border border-[var(--gray-300)] text-[var(--gray-600)] text-sm rounded-[var(--radius-md)] hover:bg-[var(--gray-50)] disabled:opacity-50 min-h-[36px]"
                >
                  Reopen Task
                </button>
              )}
              {task.is_paperwork_task && task.paperwork_wizard_id && (
                <Link
                  href={`/tasks/${task.id}`}
                  className="px-3 py-1.5 bg-[var(--accent-500)] text-white text-sm rounded-[var(--radius-md)] hover:bg-[var(--accent-600)] min-h-[36px] inline-flex items-center"
                >
                  Start Paperwork Wizard
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
