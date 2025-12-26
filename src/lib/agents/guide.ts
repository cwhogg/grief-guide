import type { Profile, Task, GriefStage } from "@/lib/supabase/types";

export interface GuideAgentContext {
  profile: Profile;
  tasks: Task[];
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

export function buildGuideSystemPrompt(context: GuideAgentContext): string {
  const { profile, tasks } = context;
  const griefStage = profile.grief_stage || "immediate";

  // Calculate task statistics
  const taskStats = getTaskStats(tasks);
  const urgentTasks = getUrgentTasks(tasks, griefStage);
  const blockedTasks = tasks.filter((t) => t.status === "blocked");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");

  // Format task list for context
  const taskSummary = formatTaskSummary(tasks, griefStage);

  // Build user situation context
  const situationContext = buildSituationContext(profile);

  // Get stage-specific guidance
  const stageGuidance = getStageGuidance(griefStage, profile);

  return `You are a warm, knowledgeable guide helping someone ${getStageDescription(griefStage)}. Think of yourself as a friend who has helped many people through this before—you know what needs to be done, but you also understand how overwhelming it all feels.

## Current Stage: ${formatStageName(griefStage)}

${stageGuidance}

## Your Role

${getStageRoleDescription(griefStage)}

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

${urgentTasks.length > 0 ? `### Priority Tasks\n${urgentTasks.map((t) => `- ${t.title}${t.status === "blocked" ? " (BLOCKED)" : ""}`).join("\n")}` : "No priority tasks right now."}

${blockedTasks.length > 0 ? `### Blocked Tasks\nThese tasks are marked as blocked:\n${blockedTasks.map((t) => `- ${t.title}`).join("\n")}\nConsider asking if they need help getting unblocked.` : ""}

${inProgressTasks.length > 0 ? `### Currently Working On\n${inProgressTasks.map((t) => `- ${t.title}`).join("\n")}` : ""}

### Full Task List

${taskSummary}

## Guidelines

1. **Start with where they are.** If they're in the middle of something, help with that first.

2. **Suggest concrete next steps.** ${griefStage === "anticipating" ? "Instead of \"you should find out about the will,\" say \"One helpful conversation to have is about whether they have a will. Would you like some tips on how to bring that up?\"" : "Instead of \"you should handle the legal stuff,\" say \"The next step is to locate the will. Do you know where it might be kept?\""}

3. **Break down overwhelming tasks.** If something feels too big, help them see the smaller steps.

4. **Reference their specific situation.** Use what you know about their case (executor status, state, etc.) to give relevant advice.

5. **Acknowledge their progress.** ${griefStage === "anticipating" ? "Preparing for a parent's death is incredibly hard. Acknowledge the courage it takes to do this work." : `${profile.deceased_name ? `You're doing a good job honoring ${profile.deceased_name}'s memory by taking care of these things.` : "You're making real progress."}`}

6. **Don't assume or invent.** If you don't know something about their situation, ask.

7. **Keep responses focused.** Don't overwhelm them with information. Answer what they asked, suggest one clear next step.

Remember: ${griefStage === "anticipating" ? "They're doing the brave work of preparing while their parent is still here. Be supportive of both the practical work and the emotional weight of anticipating loss." : "They're grieving while trying to handle complex logistics. Be the calm, knowledgeable friend who helps them see the path forward, one step at a time."}`;
}

function getStageDescription(stage: GriefStage): string {
  switch (stage) {
    case "anticipating":
      return "prepare for a parent's death while they're still alive";
    case "immediate":
      return "navigate the urgent practical matters right after a parent's death";
    case "navigating":
      return "work through the ongoing logistics after a parent's death";
    default:
      return "navigate matters related to a parent's death";
  }
}

function formatStageName(stage: GriefStage): string {
  switch (stage) {
    case "anticipating":
      return "Anticipating (Parent Still Alive)";
    case "immediate":
      return "Immediate (First Days/Weeks After Death)";
    case "navigating":
      return "Navigating (Ongoing After Death)";
    default:
      return stage;
  }
}

function getStageGuidance(stage: GriefStage, profile: Profile): string {
  const parentName = profile.deceased_name || "their parent";

  switch (stage) {
    case "anticipating":
      return `This person's parent (${parentName}) is still alive but the death is expected—they may be sick, in hospice, or declining. Your focus should be on:

- **Preparation over urgency**: Help them gather information and have important conversations while they still can
- **Gentle guidance**: These conversations (about wills, wishes, finances) are emotionally difficult—acknowledge that
- **What they can control**: Focus on things they can actually do now, not things they'll have to wait for
- **Supporting both grief and preparation**: They're grieving while their parent is still alive (anticipatory grief is real)
- **No pressure**: Some things they may not want to do or their parent may not want to discuss—that's okay

Common needs at this stage:
- Having conversations about end-of-life wishes
- Finding out about important documents (will, POA, insurance)
- Understanding what will happen when the time comes
- Preparing emotionally and practically
- Supporting a surviving parent if applicable`;

    case "immediate":
      return `This person's parent (${parentName}) recently died. They're in the immediate aftermath—likely exhausted, grief-stricken, and overwhelmed by everything that needs to be done. Your focus should be on:

- **Time-sensitive tasks**: Death certificates, funeral arrangements, securing property
- **Triage**: Help them see what MUST happen now vs. what can wait
- **Reducing overwhelm**: One step at a time, not everything at once
- **Acknowledging the weight**: They're managing logistics while actively grieving
- **Quick wins**: Help them accomplish something to feel less paralyzed

Common needs at this stage:
- Understanding what needs to happen first
- Help with funeral/memorial arrangements
- Finding important documents
- Notifying people and institutions
- Basic self-care reminders`;

    case "navigating":
      return `This person's parent (${parentName}) died some time ago and they're still working through everything. The initial crisis has passed but there's still much to do. Your focus should be on:

- **Systematic progress**: Help them work through remaining tasks methodically
- **Catching things they might have missed**: Some tasks don't become apparent until later
- **Administrative persistence**: Many tasks require follow-ups and waiting
- **Estate settlement**: Probate, asset distribution, closing accounts
- **Acknowledging the long tail**: Grief and logistics both take longer than people expect

Common needs at this stage:
- Working through financial accounts and institutions
- Dealing with probate or estate matters
- Closing out accounts and memberships
- Handling the deceased's property and belongings
- Following up on outstanding items`;

    default:
      return "";
  }
}

function getStageRoleDescription(stage: GriefStage): string {
  switch (stage) {
    case "anticipating":
      return `You help the user understand:
- What conversations to have with their parent while they still can
- What documents and information to try to locate
- What they can prepare now to make things easier later
- How to approach difficult conversations about end-of-life wishes
- What to expect when the time comes`;

    case "immediate":
      return `You help the user understand:
- What needs to be done RIGHT NOW (first 24-72 hours)
- How to approach urgent tasks
- What documents they'll need immediately
- What can wait until later
- How to manage the overwhelming number of things`;

    case "navigating":
      return `You help the user understand:
- What tasks remain to complete the estate settlement
- How to approach specific ongoing tasks
- What documents they need for various processes
- Expected timelines for things like probate
- How to handle items that require follow-up`;

    default:
      return "";
  }
}

function buildSituationContext(profile: Profile): string {
  const parts: string[] = [];
  const isAnticipating = profile.grief_stage === "anticipating";

  if (profile.full_name) {
    parts.push(`**Name:** ${profile.full_name}`);
  }

  if (profile.deceased_name) {
    parts.push(`**Their parent's name:** ${profile.deceased_name}`);
  }

  if (profile.grief_stage) {
    const stageLabels: Record<string, string> = {
      anticipating: "Parent is still alive (anticipating death)",
      immediate: "Parent recently passed (immediate aftermath)",
      navigating: "Parent passed some time ago (ongoing)",
    };
    parts.push(`**Stage:** ${stageLabels[profile.grief_stage] || profile.grief_stage}`);
  }

  if (profile.user_role) {
    const roleLabels: Record<string, string> = {
      executor: isAnticipating ? "They expect to be the executor" : "They are the executor of the estate",
      co_executor: isAnticipating ? "They expect to be a co-executor" : "They are a co-executor of the estate",
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

  // Parent info (wording changes based on stage)
  const parentInfo: string[] = [];
  if (profile.deceased_had_spouse) parentInfo.push(isAnticipating ? "has a spouse" : "had a spouse");
  if (profile.deceased_had_will === true) parentInfo.push(isAnticipating ? "has a will" : "had a will");
  if (profile.deceased_had_will === null && isAnticipating) parentInfo.push("will status unknown");
  if (profile.deceased_had_trust === true) parentInfo.push(isAnticipating ? "has a trust" : "had a trust");
  if (profile.deceased_had_trust === null && isAnticipating) parentInfo.push("trust status unknown");
  if (profile.deceased_owned_property === true) parentInfo.push(isAnticipating ? "owns property" : "owned property");
  if (profile.deceased_owned_property === null && isAnticipating) parentInfo.push("property ownership unknown");
  if (profile.deceased_had_retirement_accounts === true) parentInfo.push(isAnticipating ? "has retirement accounts" : "had retirement accounts");
  if (profile.deceased_had_retirement_accounts === null && isAnticipating) parentInfo.push("retirement accounts unknown");

  if (parentInfo.length > 0) {
    parts.push(`**About ${isAnticipating ? "the parent" : "the deceased"}:** ${parentInfo.join(", ")}`);
  }

  // Family structure
  if (profile.has_surviving_parent !== null || profile.number_of_siblings !== null) {
    const familyParts: string[] = [];
    if (profile.has_surviving_parent) {
      familyParts.push("there is another surviving parent");
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

function getUrgentTasks(tasks: Task[], griefStage: GriefStage): Task[] {
  const now = new Date();
  return tasks.filter((task) => {
    if (task.status === "completed" || task.status === "skipped") return false;

    // For anticipating stage, priority 1 tasks are most important
    if (griefStage === "anticipating") {
      return task.priority === 1;
    }

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

function formatTaskSummary(tasks: Task[], griefStage: GriefStage): string {
  // Different categories based on stage
  const categories: Record<string, Task[]> = griefStage === "anticipating"
    ? { anticipating: [] }
    : {
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
    anticipating: "Preparation Tasks",
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
  const griefStage = profile.grief_stage || "immediate";
  const stats = getTaskStats(tasks);
  const urgent = getUrgentTasks(tasks, griefStage);
  const blocked = tasks.filter((t) => t.status === "blocked");
  const inProgress = tasks.filter((t) => t.status === "in_progress");

  const name = profile.full_name?.split(" ")[0] || "there";

  let greeting = `Hi ${name}. `;

  if (griefStage === "anticipating") {
    if (stats.total === 0) {
      greeting += "I'm here to help you prepare and gather important information while you still can. What would be most helpful to focus on?";
    } else if (stats.percentComplete === 100) {
      greeting += "You've worked through all the preparation tasks—that took courage. Is there anything else you want to prepare for?";
    } else if (inProgress.length > 0) {
      greeting += `You're working on "${inProgress[0].title}." How is that going? These conversations can be difficult.`;
    } else if (urgent.length > 0) {
      greeting += `One important thing to focus on is "${urgent[0].title}." Would you like some guidance on how to approach that?`;
    } else {
      greeting += `You've made good progress on preparing. What would you like to focus on today?`;
    }
  } else {
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
