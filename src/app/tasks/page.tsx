"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TaskList } from "@/components/tasks/TaskList";
import { useUser } from "@/hooks/useUser";
import type { Task } from "@/lib/supabase/types";

export default function TasksPage() {
  const router = useRouter();
  const { user, profile, isLoading: userLoading, initialize } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
    if (!userLoading && profile && !profile.onboarding_completed) {
      router.push("/onboarding");
    }
  }, [userLoading, user, profile, router]);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks");
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }
      const data = await response.json();
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && profile?.onboarding_completed) {
      fetchTasks();
    }
  }, [user, profile, fetchTasks]);

  const handleTaskUpdate = async (
    taskId: string,
    updates: Partial<Task>
  ): Promise<void> => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      )
    );

    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, ...updates }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      const data = await response.json();
      // Update with server response
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? data.task : task))
      );
    } catch (err) {
      // Revert on error
      fetchTasks();
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--foreground-muted)]">Loading...</div>
      </div>
    );
  }

  if (!user || !profile?.onboarding_completed) {
    return null;
  }

  return (
    <main className="min-h-screen min-h-[100dvh] bg-[var(--background)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--gray-200)] safe-area-top">
        <div className="max-w-4xl mx-auto px-5 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--gray-900)]">
                Your Tasks
              </h1>
              <p className="text-[var(--gray-500)] mt-1">
                One step at a time. We&apos;re here to help you through this.
              </p>
            </div>
            <nav className="flex items-center gap-4">
              <a
                href="/chat"
                className="text-[var(--primary-600)] hover:text-[var(--primary-700)] transition-colors font-medium"
              >
                Back to Chat
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-5 py-6">
        {error && (
          <div className="mb-6 p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-[var(--radius-lg)] text-[var(--error)]">
            {error}
            <button
              onClick={() => {
                setError(null);
                fetchTasks();
              }}
              className="ml-4 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        <TaskList
          tasks={tasks}
          onTaskUpdate={handleTaskUpdate}
          isLoading={isLoading}
        />
      </div>
    </main>
  );
}
