"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import type { Task, TimelineCategory, TaskType } from "@/lib/supabase/types";

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  focusCategory: TimelineCategory | null;
}

interface TaskWithMeta extends Task {
  urgencyScore?: number;
}

const TIMELINE_LABELS: Record<TimelineCategory, string> = {
  immediate: "Immediate",
  first_week: "First Week",
  first_month: "First Month",
  ongoing: "Ongoing",
};

const TASK_TYPE_ICONS: Record<TaskType, React.ReactNode> = {
  paperwork: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  legal: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
  financial: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  notifications: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  logistics: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getEncouragingMessage(stats: DashboardStats, deceasedName: string | null): string {
  const { completedTasks, totalTasks } = stats;
  const percentComplete = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (totalTasks === 0) {
    return "Let's take this one step at a time.";
  }

  if (percentComplete === 0) {
    return `There's a lot to do after losing ${deceasedName || "someone you love"}, but you don't have to do it all today. Start with one small step.`;
  }

  if (percentComplete < 25) {
    return "You've made a start, and that takes courage. Keep going at your own pace.";
  }

  if (percentComplete < 50) {
    return "You're making real progress. Remember to take breaks when you need them.";
  }

  if (percentComplete < 75) {
    return "You've accomplished so much already. The hardest part is behind you.";
  }

  if (percentComplete < 100) {
    return "You're almost there. You've handled this with such strength.";
  }

  return "You've completed everything. Take a moment to acknowledge what you've accomplished.";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, isLoading: userLoading, initialize } = useUser();

  const [tasks, setTasks] = useState<TaskWithMeta[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    focusCategory: null,
  });
  const [suggestedTasks, setSuggestedTasks] = useState<TaskWithMeta[]>([]);
  const [recentlyCompleted, setRecentlyCompleted] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCheckIn, setShowCheckIn] = useState(false);

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

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/tasks");
      if (!response.ok) throw new Error("Failed to fetch tasks");

      const data = await response.json();
      const allTasks: TaskWithMeta[] = data.tasks || [];

      setTasks(allTasks);

      // Calculate stats
      const completed = allTasks.filter((t) => t.status === "completed");
      const inProgress = allTasks.filter((t) => t.status === "in_progress");
      const pending = allTasks.filter((t) => t.status === "pending");

      // Determine focus category (most urgent category with pending tasks)
      const categoryPriority: TimelineCategory[] = ["immediate", "first_week", "first_month", "ongoing"];
      let focusCategory: TimelineCategory | null = null;
      for (const cat of categoryPriority) {
        if (pending.some((t) => t.timeline_category === cat) ||
            inProgress.some((t) => t.timeline_category === cat)) {
          focusCategory = cat;
          break;
        }
      }

      setStats({
        totalTasks: allTasks.length,
        completedTasks: completed.length,
        inProgressTasks: inProgress.length,
        focusCategory,
      });

      // Get suggested next steps (highest priority incomplete tasks)
      const incompleteTasks = allTasks
        .filter((t) => t.status === "pending" || t.status === "in_progress")
        .map((t) => ({
          ...t,
          urgencyScore: calculateUrgencyScore(t),
        }))
        .sort((a, b) => (b.urgencyScore || 0) - (a.urgencyScore || 0));

      setSuggestedTasks(incompleteTasks.slice(0, 3));

      // Get recently completed tasks
      const recentCompleted = completed
        .filter((t) => t.completed_at)
        .sort((a, b) =>
          new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()
        )
        .slice(0, 3);

      setRecentlyCompleted(recentCompleted);

      // Show check-in if therapist setting is enabled and it's been a while
      if (profile?.check_in_frequency && profile.check_in_frequency !== "as_needed") {
        // Simple check - show if there are tasks but user hasn't completed any recently
        const hasRecentActivity = recentCompleted.some((t) => {
          const completedDate = new Date(t.completed_at!);
          const daysSince = (Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince < 2;
        });
        setShowCheckIn(!hasRecentActivity && allTasks.length > 0);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile?.onboarding_completed) {
      fetchDashboardData();
    }
  }, [user, profile, fetchDashboardData]);

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  if (!user || !profile?.onboarding_completed) {
    return null;
  }

  const firstName = profile.full_name?.split(" ")[0] || "";
  const progressPercent = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-stone-900">Grief Guide</h1>
            <nav className="flex items-center gap-4">
              <Link
                href="/tasks"
                className="text-sm text-stone-600 hover:text-stone-900"
              >
                Tasks
              </Link>
              <Link
                href="/resources"
                className="text-sm text-stone-600 hover:text-stone-900"
              >
                Resources
              </Link>
              <button
                onClick={() => useUser.getState().signOut().then(() => router.push("/login"))}
                className="text-sm text-stone-500 hover:text-stone-700"
              >
                Sign out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Warm Greeting */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-stone-900 mb-2">
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </h2>
          <p className="text-stone-600 leading-relaxed">
            {getEncouragingMessage(stats, profile.deceased_name)}
          </p>
        </section>

        {/* Optional Check-in Prompt */}
        {showCheckIn && (
          <section className="mb-8">
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-violet-900 mb-1">
                    How are you doing today?
                  </h3>
                  <p className="text-sm text-violet-700 mb-3">
                    It's okay to take breaks. If you need to talk, we're here.
                  </p>
                  <div className="flex gap-3">
                    <Link
                      href="/chat/therapist"
                      className="text-sm bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
                    >
                      Talk to someone
                    </Link>
                    <button
                      onClick={() => setShowCheckIn(false)}
                      className="text-sm text-violet-600 px-4 py-2 hover:text-violet-800"
                    >
                      I'm okay for now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Quick Stats */}
        <section className="mb-8">
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-sm text-stone-500 mb-1">Your Progress</p>
                <p className="text-2xl font-semibold text-stone-900">
                  {stats.completedTasks} of {stats.totalTasks} tasks complete
                </p>
              </div>
              {stats.focusCategory && (
                <div className="text-right">
                  <p className="text-sm text-stone-500 mb-1">Current Focus</p>
                  <span className="inline-block bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                    {TIMELINE_LABELS[stats.focusCategory]}
                  </span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm text-stone-500 mt-2">
              {progressPercent}% complete
              {stats.inProgressTasks > 0 && (
                <span> · {stats.inProgressTasks} in progress</span>
              )}
            </p>
          </div>
        </section>

        {/* Suggested Next Steps */}
        {suggestedTasks.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-900">
                Suggested Next Steps
              </h3>
              <Link
                href="/tasks"
                className="text-sm text-amber-600 hover:text-amber-700"
              >
                View all tasks
              </Link>
            </div>
            <div className="space-y-3">
              {suggestedTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="block bg-white rounded-xl border border-stone-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      task.status === "in_progress"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-stone-100 text-stone-500"
                    }`}>
                      {TASK_TYPE_ICONS[task.task_type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-stone-900 truncate">
                          {task.title}
                        </h4>
                        {task.status === "in_progress" && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            In Progress
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-stone-600 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-stone-500">
                          {TIMELINE_LABELS[task.timeline_category]}
                        </span>
                        {task.priority <= 2 && (
                          <span className="text-xs text-red-600 font-medium">
                            High priority
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Quick Access Cards */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">
            Quick Access
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/tasks"
              className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow text-center"
            >
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h4 className="font-medium text-stone-900 mb-1">View All Tasks</h4>
              <p className="text-xs text-stone-500">
                {stats.totalTasks - stats.completedTasks} remaining
              </p>
            </Link>

            <Link
              href="/chat/guide"
              className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow text-center"
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="font-medium text-stone-900 mb-1">Talk to Guide</h4>
              <p className="text-xs text-stone-500">Get answers & help</p>
            </Link>

            <Link
              href="/chat/therapist"
              className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow text-center"
            >
              <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h4 className="font-medium text-stone-900 mb-1">Emotional Support</h4>
              <p className="text-xs text-stone-500">A safe space to talk</p>
            </Link>

            <Link
              href="/resources"
              className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow text-center"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="font-medium text-stone-900 mb-1">Find Help</h4>
              <p className="text-xs text-stone-500">Professionals & services</p>
            </Link>
          </div>
        </section>

        {/* Recent Activity */}
        {recentlyCompleted.length > 0 && (
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-stone-900 mb-4">
              Recently Completed
            </h3>
            <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
              {recentlyCompleted.map((task) => (
                <div key={task.id} className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900 truncate">{task.title}</p>
                    <p className="text-xs text-stone-500">
                      Completed {formatRelativeTime(task.completed_at!)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Crisis Footer */}
        <footer className="text-center py-6 border-t border-stone-200">
          <p className="text-sm text-stone-500 mb-2">
            In crisis or need immediate support?
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <a href="tel:988" className="text-violet-600 hover:text-violet-700 font-medium">
              Call or text 988
            </a>
            <span className="text-stone-300">|</span>
            <a
              href="https://988lifeline.org/chat/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 hover:text-violet-700 font-medium"
            >
              Chat online
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

// Helper function to calculate task urgency
function calculateUrgencyScore(task: Task): number {
  let score = 0;

  // Timeline urgency
  const timelineScores: Record<TimelineCategory, number> = {
    immediate: 100,
    first_week: 75,
    first_month: 50,
    ongoing: 25,
  };
  score += timelineScores[task.timeline_category];

  // Priority (lower number = higher priority)
  score += (10 - Math.min(task.priority, 10)) * 5;

  // In-progress tasks get a boost
  if (task.status === "in_progress") {
    score += 20;
  }

  // Paperwork tasks often have external deadlines
  if (task.is_paperwork_task) {
    score += 10;
  }

  return score;
}

// Helper function to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}
