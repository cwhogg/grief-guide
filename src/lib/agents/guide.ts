import type { Profile, Task } from "@/lib/supabase/types";

export interface GuideAgentContext {
  profile: Profile;
  tasks: Task[];
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

export function buildGuideSystemPrompt(context: GuideAgentContext): string {
  const { profile, tasks } = context;

  // Calculate task statistics
  const taskStats = getTaskStats(tasks);
  const urgentTasks = getUrgentTasks(tasks);
  const blockedTasks = tasks.filter((t) => t.status === "blocked");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");

  // Format task list for context
  const taskSummary = formatTaskSummary(tasks);

  // Build user situation context
  const situationContext = buildSituationContext(profile);

  return `You are a warm, knowledgeable guide helping someone navigate the practical matters after the death of their parent. Think of yourself as a friend who has helped many people through this before—you know what needs to be done, but you also understand how overwhelming it all feels.

## Your Role

You help the user understand:
- What they should focus on right now
- How to approach specific tasks
- What documents they'll need
- What to expect from various processes
- Where to find help for specific issues

You are NOT a therapist, lawyer, or financial advisor. For deep emotional support, suggest they speak with the Therapist agent. For specific legal or financial questions, you provide general guidance but recommend they consult professionals.

## Communication Style

- Warm but efficient—you respect their time and energy
- Organized—you help bring order to chaos
- Gently proactive—you suggest next steps without being pushy
- Honest—you acknowledge when things are hard or complicated
- Encouraging—you notice and celebrate their progress

When they express emotional distress:
- Acknowledge their feelings warmly and briefly
- Don't try to "fix" or minimize their grief
- Offer to help them with practical tasks when they're ready
- Suggest the Therapist agent if they need to talk through feelings more deeply

## About This User

${situationContext}

## Their Current Task Status

${taskStats.total} total tasks | ${taskStats.completed} completed (${taskStats.percentComplete}%) | ${taskStats.inProgress} in progress | ${taskStats.blocked} blocked

${urgentTasks.length > 0 ? `### Priority Tasks (Immediate or Overdue)\n${urgentTasks.map((t) => `- ${t.title}${t.status === "blocked" ? " (BLOCKED)" : ""}`).join("\n")}` : "No urgent tasks right now."}

${blockedTasks.length > 0 ? `### Blocked Tasks\nThese tasks are marked as blocked:\n${blockedTasks.map((t) => `- ${t.title}`).join("\n")}\nConsider asking if they need help getting unblocked.` : ""}

${inProgressTasks.length > 0 ? `### Currently Working On\n${inProgressTasks.map((t) => `- ${t.title}`).join("\n")}` : ""}

### Full Task List by Category

${taskSummary}

## Guidelines

1. **Start with where they are.** If they're in the middle of something, help with that first.

2. **Suggest concrete next steps.** Instead of "you should handle the legal stuff," say "The next step is to locate the will. Do you know where it might be kept?"

3. **Break down overwhelming tasks.** If something feels too big, help them see the smaller steps.

4. **Reference their specific situation.** Use what you know about their case (executor status, state, etc.) to give relevant advice.

5. **Celebrate progress.** When they complete tasks, acknowledge it warmly. "${profile.deceased_name ? `You're doing a good job honoring ${profile.deceased_name}'s memory by taking care of these things.` : "You're making real progress."}"

6. **Don't assume or invent.** If you don't know something about their situation, ask.

7. **Keep responses focused.** Don't overwhelm them with information. Answer what they asked, suggest one clear next step.

Remember: They're grieving while trying to handle complex logistics. Be the calm, knowledgeable friend who helps them see the path forward, one step at a time.`;
}

function buildSituationContext(profile: Profile): string {
  const parts: string[] = [];

  if (profile.full_name) {
    parts.push(`**Name:** ${profile.full_name}`);
  }

  if (profile.deceased_name) {
    parts.push(`**Their parent's name:** ${profile.deceased_name}`);
  }

  if (profile.user_role) {
    const roleLabels: Record<string, string> = {
      executor: "They are the executor of the estate",
      co_executor: "They are a co-executor of the estate",
      spouse: "They are the surviving spouse",
      only_child: "They are the only child handling everything",
      family_helper: "They are helping their family (not the primary executor)",
      other: "Their role is not specified",
    };
    parts.push(`**Role:** ${roleLabels[profile.user_role] || profile.user_role}`);
  }

  if (profile.state) {
    parts.push(`**State:** ${profile.state} (estate laws vary by state)`);
  }

  // Deceased info
  const deceasedInfo: string[] = [];
  if (profile.deceased_had_spouse) deceasedInfo.push("had a spouse");
  if (profile.deceased_had_will) deceasedInfo.push("had a will");
  if (profile.deceased_had_trust) deceasedInfo.push("had a trust");
  if (profile.deceased_owned_property) deceasedInfo.push("owned property");
  if (profile.deceased_had_retirement_accounts) deceasedInfo.push("had retirement accounts");

  if (deceasedInfo.length > 0) {
    parts.push(`**About the deceased:** ${deceasedInfo.join(", ")}`);
  }

  // Family structure
  if (profile.has_surviving_parent !== null || profile.number_of_siblings !== null) {
    const familyParts: string[] = [];
    if (profile.has_surviving_parent) {
      familyParts.push("there is a surviving parent");
    }
    if (profile.number_of_siblings !== null) {
      if (profile.number_of_siblings === 0) {
        familyParts.push("they are an only child");
      } else {
        familyParts.push(`they have ${profile.number_of_siblings} sibling(s)`);
      }
    }
    if (familyParts.length > 0) {
      parts.push(`**Family:** ${familyParts.join(", ")}`);
    }
  }

  if (profile.check_in_frequency) {
    const freqLabels: Record<string, string> = {
      daily: "daily",
      weekly: "weekly",
      as_needed: "only when they ask",
    };
    parts.push(`**Preferred check-in frequency:** ${freqLabels[profile.check_in_frequency]}`);
  }

  return parts.length > 0 ? parts.join("\n") : "Limited information available about their situation.";
}

function getTaskStats(tasks: Task[]) {
  const total = tasks.length;
  const completed = tasks.filter(
    (t) => t.status === "completed" || t.status === "skipped"
  ).length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, inProgress, blocked, pending, percentComplete };
}

function getUrgentTasks(tasks: Task[]): Task[] {
  const now = new Date();
  return tasks.filter((task) => {
    if (task.status === "completed" || task.status === "skipped") return false;

    // Immediate tasks are always urgent
    if (task.timeline_category === "immediate") return true;

    // Overdue tasks are urgent
    if (task.due_date && new Date(task.due_date) < now) return true;

    // Due within 3 days
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      if (dueDate <= threeDaysFromNow) return true;
    }

    return false;
  });
}

function formatTaskSummary(tasks: Task[]): string {
  const categories: Record<string, Task[]> = {
    immediate: [],
    first_week: [],
    first_month: [],
    ongoing: [],
  };

  tasks.forEach((task) => {
    if (categories[task.timeline_category]) {
      categories[task.timeline_category].push(task);
    }
  });

  const categoryLabels: Record<string, string> = {
    immediate: "Immediate (First 24-48 hours)",
    first_week: "First Week",
    first_month: "First Month",
    ongoing: "Ongoing",
  };

  const sections: string[] = [];

  for (const [category, categoryTasks] of Object.entries(categories)) {
    if (categoryTasks.length === 0) continue;

    const statusEmoji: Record<string, string> = {
      pending: "[ ]",
      in_progress: "[~]",
      completed: "[x]",
      blocked: "[!]",
      skipped: "[-]",
    };

    const taskLines = categoryTasks
      .sort((a, b) => a.priority - b.priority)
      .map((t) => `  ${statusEmoji[t.status]} ${t.title}`)
      .join("\n");

    sections.push(`**${categoryLabels[category]}**\n${taskLines}`);
  }

  return sections.join("\n\n");
}

// Helper to create initial greeting based on context
export function getInitialGreeting(context: GuideAgentContext): string {
  const { profile, tasks } = context;
  const stats = getTaskStats(tasks);
  const urgent = getUrgentTasks(tasks);
  const blocked = tasks.filter((t) => t.status === "blocked");
  const inProgress = tasks.filter((t) => t.status === "in_progress");

  const name = profile.full_name?.split(" ")[0] || "there";

  let greeting = `Hi ${name}. `;

  if (stats.total === 0) {
    greeting += "It looks like we're just getting started. How can I help you today?";
  } else if (stats.percentComplete === 100) {
    greeting += "You've completed all your tasks—that's a significant accomplishment. Is there anything else I can help you with?";
  } else if (blocked.length > 0) {
    greeting += `I see you have ${blocked.length} blocked task${blocked.length > 1 ? "s" : ""}. Would you like help getting unblocked on ${blocked.length === 1 ? "that" : "any of those"}?`;
  } else if (inProgress.length > 0) {
    greeting += `You're working on "${inProgress[0].title}." How's that going? Can I help with anything?`;
  } else if (urgent.length > 0) {
    greeting += `You have ${urgent.length} priority task${urgent.length > 1 ? "s" : ""} to focus on. Would you like to talk through "${urgent[0].title}"?`;
  } else {
    greeting += `You've made good progress—${stats.percentComplete}% complete. What would you like to focus on today?`;
  }

  return greeting;
}

// Format messages for OpenAI API
export function formatMessagesForAPI(
  systemPrompt: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
) {
  return [
    { role: "system" as const, content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user" as const, content: userMessage },
  ];
}
