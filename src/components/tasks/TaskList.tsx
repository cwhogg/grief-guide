"use client";

import { useState, useMemo } from "react";
import { TaskCard } from "./TaskCard";
import type {
  Task,
  TaskStatus,
  TaskType,
  TimelineCategory,
} from "@/lib/supabase/types";

interface TaskListProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  isLoading?: boolean;
}

const TIMELINE_CATEGORIES: {
  value: TimelineCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "discovery",
    label: "Find Out First",
    description: "Gather information you don't know",
  },
  {
    value: "anticipating",
    label: "While Preparing",
    description: "Before the loss occurs",
  },
  {
    value: "immediate",
    label: "Immediate",
    description: "First 24-48 hours",
  },
  {
    value: "first_week",
    label: "First Week",
    description: "Days 2-7",
  },
  {
    value: "first_month",
    label: "First Month",
    description: "Weeks 2-4",
  },
  {
    value: "ongoing",
    label: "Ongoing",
    description: "As needed",
  },
];

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "paperwork", label: "Paperwork" },
  { value: "legal", label: "Legal" },
  { value: "financial", label: "Financial" },
  { value: "notifications", label: "Notifications" },
  { value: "logistics", label: "Logistics" },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Not Applicable" },
];

function getProgressMessage(completed: number): string {
  if (completed === 0) {
    return "There's no rush. Start with whatever feels manageable.";
  } else if (completed === 1) {
    return "You've gotten one thing done. That counts.";
  } else if (completed < 5) {
    return "You're making progress.";
  } else if (completed < 10) {
    return "You've handled quite a bit already.";
  } else {
    return "You've accomplished a lot.";
  }
}

export function TaskList({ tasks, onTaskUpdate, isLoading }: TaskListProps) {
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([
    "pending",
    "in_progress",
    "blocked",
  ]);
  const [selectedTypes, setSelectedTypes] = useState<TaskType[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Group and filter tasks
  const { groupedTasks, stats } = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const statusMatch =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(task.status);
      const typeMatch =
        selectedTypes.length === 0 || selectedTypes.includes(task.task_type);
      return statusMatch && typeMatch;
    });

    const grouped: Record<TimelineCategory, Task[]> = {
      discovery: [],
      anticipating: [],
      immediate: [],
      first_week: [],
      first_month: [],
      ongoing: [],
    };

    filtered.forEach((task) => {
      grouped[task.timeline_category].push(task);
    });

    // Sort tasks within each group by priority, then by status (active first)
    const statusOrder: Record<TaskStatus, number> = {
      in_progress: 0,
      blocked: 1,
      pending: 2,
      completed: 3,
      skipped: 4,
    };

    Object.keys(grouped).forEach((key) => {
      grouped[key as TimelineCategory].sort((a, b) => {
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        return a.priority - b.priority;
      });
    });

    const completedCount = tasks.filter(
      (t) => t.status === "completed" || t.status === "skipped"
    ).length;

    return {
      groupedTasks: grouped,
      stats: {
        total: tasks.length,
        completed: completedCount,
        inProgress: tasks.filter((t) => t.status === "in_progress").length,
        blocked: tasks.filter((t) => t.status === "blocked").length,
      },
    };
  }, [tasks, selectedStatuses, selectedTypes]);

  const toggleStatus = (status: TaskStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const toggleType = (type: TaskType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    await onTaskUpdate(taskId, { status });
  };

  const handleNotesChange = async (taskId: string, notes: string) => {
    await onTaskUpdate(taskId, { notes });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-stone-500">Loading your tasks...</div>
      </div>
    );
  }

  const remaining = stats.total - stats.completed;

  return (
    <div className="space-y-6">
      {/* Progress overview */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-stone-900">
            {stats.completed > 0
              ? `${stats.completed} thing${stats.completed === 1 ? "" : "s"} done`
              : "Your tasks"}
          </h2>
          {remaining > 0 && (
            <p className="text-sm text-stone-500 mt-1">
              {remaining} thing{remaining === 1 ? "" : "s"} left
            </p>
          )}
        </div>

        <p className="text-sm text-stone-600 italic">
          {getProgressMessage(stats.completed)}
        </p>

        {/* Quick stats - only show if there's something notable */}
        {(stats.inProgress > 0 || stats.blocked > 0) && (
          <div className="flex gap-4 mt-4 pt-4 border-t border-stone-100">
            {stats.inProgress > 0 && (
              <div className="text-sm text-stone-600">
                <span className="font-medium text-blue-600">{stats.inProgress}</span> in progress
              </div>
            )}
            {stats.blocked > 0 && (
              <div className="text-sm text-stone-600">
                <span className="font-medium text-orange-600">{stats.blocked}</span> stuck
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-medium text-stone-900">Filters</span>
          <svg
            className={`w-5 h-5 text-stone-400 transition-transform ${
              showFilters ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showFilters && (
          <div className="mt-4 space-y-4">
            {/* Status filters */}
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => toggleStatus(status.value)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      selectedStatuses.includes(status.value)
                        ? "bg-amber-600 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Type filters */}
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-2">
                Type
              </label>
              <div className="flex flex-wrap gap-2">
                {TASK_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => toggleType(type.value)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      selectedTypes.includes(type.value)
                        ? "bg-amber-600 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {(selectedStatuses.length > 0 || selectedTypes.length > 0) && (
              <button
                onClick={() => {
                  setSelectedStatuses(["pending", "in_progress", "blocked"]);
                  setSelectedTypes([]);
                }}
                className="text-sm text-amber-600 hover:text-amber-700"
              >
                Reset to defaults
              </button>
            )}
          </div>
        )}
      </div>

      {/* Task groups by timeline */}
      {TIMELINE_CATEGORIES.map((category) => {
        const categoryTasks = groupedTasks[category.value];
        if (categoryTasks.length === 0) return null;

        return (
          <div key={category.value} className="space-y-3">
            <div>
              <h3 className="font-semibold text-stone-900">{category.label}</h3>
              <p className="text-sm text-stone-500">{category.description}</p>
            </div>

            <div className="space-y-2">
              {categoryTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onNotesChange={handleNotesChange}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {Object.values(groupedTasks).every((group) => group.length === 0) && (
        <div className="text-center py-12">
          <svg
            className="w-12 h-12 mx-auto text-stone-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-stone-900">
            No tasks match your filters
          </h3>
          <p className="mt-2 text-stone-500">
            Try adjusting your filters to see more tasks.
          </p>
        </div>
      )}
    </div>
  );
}
