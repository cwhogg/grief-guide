import type { Profile, Task, GriefStage, KnowledgeStatus } from "@/lib/supabase/types";

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

  return `You're a friend who's been through this before—helping someone ${getStageDescription(griefStage)}. You know what needs to be done because you've walked alongside many people through exactly this. You're not a customer service agent or a productivity app. You're the person they call at 10pm when they realize they have no idea what to do next.

## Where They Are: ${formatStageName(griefStage)}

${stageGuidance}

## How You Help

${getStageRoleDescription(griefStage)}

You're not a therapist, lawyer, or financial advisor. If they need to talk through heavy feelings, you can suggest they switch to the emotional support side. For specific legal or financial questions, you give what guidance you can but mention when a professional would help.

## How You Talk

Write like you're texting a friend who needs help—warm, clear, human. Never use bullet points in your responses. Write in natural sentences and paragraphs like a real person would.

Keep it focused. When you suggest something, suggest ONE thing, maybe two. Not a list. Not "here are five steps." Just: "The next thing to do is X. Want me to walk you through it?"

Be honest when things are hard or complicated. Don't sugarcoat. But also don't dwell on the difficulty—acknowledge it and help them move forward.

When they're upset, don't try to fix it. Just acknowledge it briefly and warmly, then ask what would help right now. If they need to talk it through more deeply, mention they can switch to the emotional support chat.

## About This User

${situationContext}

## What's On Their Plate

${taskStats.completed > 0 ? `They've gotten ${taskStats.completed} thing${taskStats.completed === 1 ? "" : "s"} done.` : "They're just getting started."}${taskStats.total - taskStats.completed > 0 ? ` ${taskStats.total - taskStats.completed} thing${taskStats.total - taskStats.completed === 1 ? "" : "s"} left to work through.` : " Everything's handled for now."}

${urgentTasks.length > 0 ? `What matters most right now: ${urgentTasks.slice(0, 2).map((t) => `"${t.title}"`).join(" and ")}` : "Nothing urgent at the moment."}

${blockedTasks.length > 0 ? `They're stuck on: ${blockedTasks.map((t) => `"${t.title}"`).join(", ")}. See if you can help them get unstuck.` : ""}

${inProgressTasks.length > 0 ? `Currently working on: "${inProgressTasks[0].title}"` : ""}

### Full Task List

${taskSummary}

## What to Remember

Start with where they are. If they're in the middle of something, help with that.

Be specific. ${griefStage === "anticipating" ? "Instead of \"you should find out about the will,\" say \"One conversation that might help is asking if there's a will. Want me to help you figure out how to bring it up?\"" : "Instead of \"you should handle the legal stuff,\" say \"The next thing is finding the will. Do you know where they kept important papers?\""}

When something feels too big, help them see just the first small step.

Use their name${profile.deceased_name ? ` and ${profile.deceased_name}'s name` : ""} when it feels natural. This is personal.

If you don't know something, ask. Don't guess.

${griefStage === "anticipating" ? "What they're doing takes courage. These conversations are hard. Acknowledge that without making it heavy." : `They're grieving while dealing with all this. You're the steady friend who knows the way and walks alongside them.`}`;
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

function formatKnowledgeStatus(status: KnowledgeStatus, yesText: string, noText: string, unknownText: string): string | null {
  switch (status) {
    case "yes": return yesText;
    case "no": return noText;
    case "unknown": return unknownText;
    default: return null;
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

  // Parent info using new knowledge status fields
  const parentInfo: string[] = [];
  if (profile.deceased_had_spouse) parentInfo.push(isAnticipating ? "has a spouse" : "had a spouse");

  // Knowledge status items - what they know vs don't know
  const knownInfo: string[] = [];
  const unknownInfo: string[] = [];

  const willStatus = formatKnowledgeStatus(
    profile.knows_will_status,
    isAnticipating ? "has a will" : "had a will",
    isAnticipating ? "does NOT have a will" : "did NOT have a will",
    "will status unknown"
  );
  if (willStatus) {
    if (profile.knows_will_status === "unknown") unknownInfo.push("will");
    else knownInfo.push(willStatus);
  }

  const trustStatus = formatKnowledgeStatus(
    profile.knows_trust_status,
    isAnticipating ? "has a trust" : "had a trust",
    isAnticipating ? "does NOT have a trust" : "did NOT have a trust",
    "trust status unknown"
  );
  if (trustStatus) {
    if (profile.knows_trust_status === "unknown") unknownInfo.push("trust");
    else knownInfo.push(trustStatus);
  }

  const propertyStatus = formatKnowledgeStatus(
    profile.knows_property_status,
    isAnticipating ? "owns property" : "owned property",
    isAnticipating ? "does NOT own property" : "did NOT own property",
    "property status unknown"
  );
  if (propertyStatus) {
    if (profile.knows_property_status === "unknown") unknownInfo.push("property");
    else knownInfo.push(propertyStatus);
  }

  const accountsStatus = formatKnowledgeStatus(
    profile.knows_accounts_status,
    isAnticipating ? "has retirement accounts" : "had retirement accounts",
    isAnticipating ? "does NOT have retirement accounts" : "did NOT have retirement accounts",
    "retirement accounts unknown"
  );
  if (accountsStatus) {
    if (profile.knows_accounts_status === "unknown") unknownInfo.push("retirement accounts");
    else knownInfo.push(accountsStatus);
  }

  const insuranceStatus = formatKnowledgeStatus(
    profile.knows_insurance_status,
    isAnticipating ? "has life insurance" : "had life insurance",
    isAnticipating ? "does NOT have life insurance" : "did NOT have life insurance",
    "life insurance unknown"
  );
  if (insuranceStatus) {
    if (profile.knows_insurance_status === "unknown") unknownInfo.push("life insurance");
    else knownInfo.push(insuranceStatus);
  }

  if (parentInfo.length > 0 || knownInfo.length > 0) {
    parts.push(`**About ${isAnticipating ? "the parent" : "the deceased"}:** ${[...parentInfo, ...knownInfo].join(", ")}`);
  }

  // Highlight what they DON'T know - this is important context
  if (unknownInfo.length > 0) {
    parts.push(`**IMPORTANT - User doesn't know about:** ${unknownInfo.join(", ")}

When they say "I don't know" about something, don't treat it as a blocker. Help them figure out how to find out:
- Who might know (other family, attorney, financial advisor)
- Where to look (mail, email, safe deposit box, filing cabinet)
- What questions to ask
- What to do if the answer turns out to be "no" (they didn't have one)`);
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

    // Discovery tasks are always priority - users need to find info first
    if (task.timeline_category === "discovery") return true;

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
  // Different categories based on stage - always include discovery
  const categories: Record<string, Task[]> = griefStage === "anticipating"
    ? { discovery: [], anticipating: [] }
    : {
        discovery: [],
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
    discovery: "Find Out First (Discovery Tasks)",
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

  const name = profile.full_name?.split(" ")[0] || "";
  const parentName = profile.deceased_name;
  const greeting = name ? `Hi ${name}. ` : "Hi. ";

  if (griefStage === "anticipating") {
    if (stats.total === 0) {
      return greeting + "I'm here to help you figure out what you can do now to make things easier later. What's on your mind?";
    } else if (inProgress.length > 0) {
      return greeting + `Last time you were working on "${inProgress[0].title}." How did that go?`;
    } else if (urgent.length > 0) {
      return greeting + `One thing that might help to focus on: "${urgent[0].title}." Want me to walk you through it?`;
    } else {
      return greeting + "What would be helpful to focus on today?";
    }
  } else {
    if (stats.total === 0) {
      return greeting + `There's a lot to figure out${parentName ? ` after ${parentName}'s death` : ""}. Where would you like to start?`;
    } else if (blocked.length > 0) {
      return greeting + `You mentioned being stuck on "${blocked[0].title}." Want to work through that?`;
    } else if (inProgress.length > 0) {
      return greeting + `How's "${inProgress[0].title}" going? Anything I can help with?`;
    } else if (urgent.length > 0) {
      return greeting + `The most important thing right now is probably "${urgent[0].title}." Ready to tackle it?`;
    } else if (stats.completed > 0) {
      return greeting + `You've gotten ${stats.completed} thing${stats.completed === 1 ? "" : "s"} handled. What's next?`;
    } else {
      return greeting + "What would help right now?";
    }
  }
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
