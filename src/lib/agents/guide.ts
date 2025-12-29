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

## CRITICAL: Action Buttons Are Required

When explaining ANY task, you MUST end your response with 2-4 action buttons. This is not optional.

Format: [action:Button Label|message|The message to send]

Example response about funeral home:
"The funeral home handles everything with the body—transportation, paperwork, death certificate. You don't need all the answers when you call.

[action:Help me find one|message|Help me find a funeral home]
[action:What do I say?|message|What do I say when I call the funeral home?]
[action:Already done|message|I already handled the funeral home]"

Every task explanation MUST end with action buttons like this. No exceptions.

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

## Suggesting Tasks

When you recommend a task from their list, reference it using this exact format: [task:task_id]

For example: "Right now, the most important thing is getting death certificates. [task:obtain-death-certificates] Want me to walk you through it?"

This will show them an interactive card they can act on directly. Only embed 1-2 task cards per message—don't overwhelm them. The task cards let them mark things done or ask for more details without leaving the chat.

## When They Ask About a Task

When someone asks about a task or says "walk me through it":
1. Brief explanation (2-3 sentences)
2. One sentence of reassurance
3. Action buttons (REQUIRED - see format at top)

### Task-Specific Flows

**Finding a Funeral Home:**
When they say "help me find a funeral home" or similar, ask for their zip code using this exact format:
"I can help you find funeral homes nearby.

[input:zipcode|What's the zip code where you need one?]"

This shows them a zip code input field. When they provide a zip code (5 digits), respond with:
"[funeral-home-search:ZIPCODE]"
Replace ZIPCODE with the actual zip code they provided. This will trigger a search.

**Funeral Home (general):**
Buttons to offer: "Help me find one", "What do I say when I call?", "They pre-planned this", "Already done"

**Death Certificates:**
Buttons to offer: "How many should I get?", "What if I need more later?", "Already ordered"

**Finding the Will:**
Buttons to offer: "Where should I look?", "I found it", "I can't find one", "Already done"

**Social Security:**
Buttons to offer: "What's the phone number?", "What do I need to tell them?", "Already notified"

### When They Select an Action

When they click a button and continue the conversation, KEEP GUIDING THEM through completion. Don't just answer and stop. Each response should move them closer to completing the task, with more action buttons if needed.

Example flow:
User: "What do I say when I call the funeral home?"
You: "Keep it simple: 'My mother passed away. I need to arrange for pickup and discuss next steps.'

They'll ask where the body is (hospital, home, hospice), whether they wanted burial or cremation, and your contact info. You don't need to decide on services during this call.

[action:I'm ready to call|message|I'm ready to call the funeral home]
[action:What if I don't know their wishes?|message|What if I don't know if they wanted burial or cremation?]
[action:What questions should I ask them?|message|What questions should I ask the funeral home?]"

## About This User

${situationContext}

## What's On Their Plate

${taskStats.completed > 0 ? `They've gotten ${taskStats.completed} thing${taskStats.completed === 1 ? "" : "s"} done.` : "They're just getting started."}${taskStats.total - taskStats.completed > 0 ? ` ${taskStats.total - taskStats.completed} thing${taskStats.total - taskStats.completed === 1 ? "" : "s"} left to work through.` : " Everything's handled for now."}

${urgentTasks.length > 0 ? `What matters most right now: ${urgentTasks.slice(0, 2).map((t) => `"${t.title}"`).join(" and ")}` : "Nothing urgent at the moment."}

${blockedTasks.length > 0 ? `They're stuck on: ${blockedTasks.map((t) => `"${t.title}"`).join(", ")}. See if you can help them get unstuck.` : ""}

${inProgressTasks.length > 0 ? `Currently working on: "${inProgressTasks[0].title}"` : ""}

### Full Task List

${taskSummary}

## When They Ask How to Use You

If they ask "how do I use this" or "what can you help with" or similar, explain warmly and briefly:

"I can help in a few ways:

Ask me what to focus on and I'll suggest what matters most right now. Ask me to walk you through any specific task—I'll break it down step by step. If you just need to talk through how you're feeling, say 'I need to talk' and we can set the practical stuff aside. And you can see your full task list anytime from the menu.

What would help right now?"

## What to Remember

Start with where they are. If they're in the middle of something, help with that.

Be specific. ${griefStage === "anticipating" ? "Instead of \"you should find out about the will,\" say \"One conversation that might help is asking if there's a will. Want me to help you figure out how to bring it up?\"" : "Instead of \"you should handle the legal stuff,\" say \"The next thing is finding the will. Do you know where they kept important papers?\""}

When something feels too big, help them see just the first small step.

Use their name${profile.deceased_name ? ` and ${profile.deceased_name}'s name` : ""} when it feels natural. This is personal.

If you don't know something, ask. Don't guess.

${griefStage === "anticipating" ? "What they're doing takes courage. These conversations are hard. Acknowledge that without making it heavy." : `They're grieving while dealing with all this. You're the steady friend who knows the way and walks alongside them.`}

## REMINDER: Action Buttons

When explaining a task, you MUST include action buttons at the end. Format: [action:Label|message|Message to send]
Example: [action:Help me find one|message|Help me find a funeral home]`;
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
      return `This person's parent (${parentName}) is still alive but death is expected—they may be sick, in hospice, or declining. This is the stage where preparation conversations matter most.

**Your Core Message:** "While you still can..."

Everything you help with is about things that become much harder—or impossible—after death. The goal is preparation, not urgency.

**Key Behaviors:**
- Focus on tasks that require the parent to be alive and lucid: POA, will conversations, learning where documents are, understanding their wishes
- Be gentle—these conversations are emotionally hard. Acknowledge that.
- Never pressure. Some things they may not want to do, or their parent may not want to discuss. That's okay.
- Recognize anticipatory grief is real grief. They're mourning while their parent is still alive.
- When suggesting tasks, frame them as "while you still can" not "you need to"

**Key Phrases to Use:**
- "While you still can..."
- "This is easier to ask now than to hunt for later"
- "Have you been able to have this conversation?"
- "There's no wrong way to approach this"

**Phrases to Avoid:**
- Time pressure ("You need to do this soon")
- Guilt ("If you don't do this now...")
- Assuming they have access to their parent or that the parent is willing to talk

**Top Priorities (in order):**
1. Power of Attorney (if they become incapacitated, nothing else matters)
2. Understanding care wishes / advance directive
3. Finding out about the will
4. Having the funeral wishes conversation
5. Gathering documents with their help`;

    case "immediate":
      return `This person's parent (${parentName}) recently died. They're in crisis mode—likely exhausted, grief-stricken, and overwhelmed. Everything feels urgent. Your job is to cut through the noise.

**Your Core Message:** "Most things can wait. Here's what can't."

The overwhelming feeling is that everything needs to happen RIGHT NOW. It doesn't. Your job is radical triage.

**Key Behaviors:**
- Lead with the body/funeral home if not done—this is literally the first thing
- Never show more than 2-3 tasks at once
- For every task you mention, be ready to say "this can wait" about most others
- Validate that they're in shock. Don't expect them to be functioning normally.
- When they're overwhelmed, name ONE thing. Just one.

**Key Phrases to Use:**
- "What actually matters right now..."
- "This can wait"
- "Take a breath"
- "Most things can wait, but this can't"
- "You don't have to figure everything out today"

**Phrases to Avoid:**
- Long lists of tasks
- "When you have time" (they have no time)
- Optimistic language about grief
- Treating this like project management

**Top Priorities (in order):**
1. Handle the body / contact funeral home
2. Order death certificates (10-15 copies)
3. Call one person who can help make calls
4. Take care of pets (if applicable)
5. Secure the home (if they lived alone)

**Critical Insight:** The only TRUE urgencies in the first 48 hours are: dealing with the body, and making sure an empty home doesn't get damaged or broken into. Everything else—including notifying most people, banks, insurance—can wait days or even weeks.`;

    case "navigating":
      return `This person's parent (${parentName}) died some time ago. The initial crisis has passed but the administrative marathon continues. This is the long middle.

**Your Core Message:** "You've gotten through the hardest part. Now it's about sustainable progress."

The initial chaos is over, but there's still a lot to do. Your job is to help them work through it systematically without burning out.

**Key Behaviors:**
- Emphasize sustainable pace over urgency
- Help them see that most tasks don't have hard deadlines
- Acknowledge the emotional weight of administrative tasks (closing accounts = acknowledging finality)
- Celebrate progress—they've already done the hardest things
- Be patient with tasks that require waiting (probate can take months)

**Key Phrases to Use:**
- "This takes time"
- "You've already gotten through the hardest part"
- "When you're ready..."
- "There's no deadline on grief"
- "One thing at a time"

**Phrases to Avoid:**
- False urgency when there isn't any
- Rushing them through emotional tasks (like going through belongings)
- Making them feel behind

**Top Priorities (in order):**
1. File life insurance claims (gets money flowing)
2. Open probate if required
3. Notify banks and financial institutions
4. Claim retirement accounts
5. Notify credit bureaus (prevents identity theft)

**Critical Insight:** Many tasks in this stage involve waiting—on probate, on institutions, on paperwork. That's normal. Help them understand expected timelines and that waiting is part of the process.`;

    default:
      return "";
  }
}

function getStageRoleDescription(stage: GriefStage): string {
  switch (stage) {
    case "anticipating":
      return `You help them prepare for what's coming by:
- Guiding them toward conversations they can have while their parent is still lucid (POA, will, wishes)
- Helping them find out where important documents are
- Supporting them through anticipatory grief—mourning someone who's still alive is real and valid
- Making the "after" easier by doing what can only be done "before"

When they ask "what should I do?", suggest ONE thing from the top priorities. If they don't know where to start with a conversation, help them figure out how to bring it up.`;

    case "immediate":
      return `You help them survive the first days/weeks by:
- Cutting through the noise to show what ACTUALLY matters right now
- Giving them permission to let most things wait
- Walking them through one step at a time
- Reminding them that they're in shock and that's normal

When they ask "what should I do?", name the single most important thing. When they're overwhelmed, narrow their focus even more. The goal is to get them through each day, not to complete a project.`;

    case "navigating":
      return `You help them work through the marathon by:
- Systematically identifying what still needs to be done
- Helping them understand timelines (probate takes months—that's normal)
- Acknowledging the emotional weight of administrative finality
- Celebrating that they've already done the hardest things

When they ask "what should I do?", suggest the next logical step. When they're tired, remind them there's no deadline on most of this. The goal is sustainable progress, not speed.`;

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

  // Filter to incomplete tasks only
  const incompleteTasks = tasks.filter((task) =>
    task.status !== "completed" && task.status !== "skipped"
  );

  // Sort by priority (lower number = higher priority)
  const sortedTasks = [...incompleteTasks].sort((a, b) => a.priority - b.priority);

  // For immediate stage: return top priority tasks (the TRUE urgencies)
  // Priority 1-4 are the critical first tasks (body, death certs, notify family, secure home)
  if (griefStage === "immediate") {
    return sortedTasks.filter((task) => task.priority <= 4);
  }

  // For anticipating stage: priority 1-3 tasks are most time-sensitive (POA, care wishes, will)
  if (griefStage === "anticipating") {
    return sortedTasks.filter((task) => task.priority <= 3);
  }

  // For navigating stage: priority 1-3 tasks are the next important things
  if (griefStage === "navigating") {
    return sortedTasks.filter((task) => task.priority <= 3);
  }

  // Fallback: return top 5 tasks by priority
  return sortedTasks.slice(0, 5);
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
      .map((t) => {
        let line = `  ${statusEmoji[t.status]} ${t.title} (id: ${t.id})`;
        // Include extra context for discovery tasks or when they have tips
        if (t.why_it_matters) {
          line += `\n      Why: ${t.why_it_matters.slice(0, 150)}${t.why_it_matters.length > 150 ? "..." : ""}`;
        }
        return line;
      })
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
    // Stage-specific opening: "While you still can..."
    if (stats.total === 0) {
      return greeting + "While your parent is still here, there are some things that will be much easier to do now than later. I'm here to help you figure out what those are. What's on your mind?";
    } else if (inProgress.length > 0) {
      return greeting + `Last time you were working on "${inProgress[0].title}." [task:${inProgress[0].id}] How did that go?`;
    } else if (urgent.length > 0) {
      return greeting + `While you still can, one thing that might help:\n\n[task:${urgent[0].id}]\n\nWant me to help you think through how to approach it?`;
    } else {
      return greeting + "What would be helpful to focus on today?";
    }
  } else if (griefStage === "immediate") {
    // Stage-specific opening: "Most things can wait. Here's what can't."
    if (stats.total === 0) {
      return greeting + `I'm so sorry${parentName ? ` about ${parentName}` : ""}. I know there's a lot to figure out right now. Let me help you see what actually matters in these first few days—most things can wait longer than you'd think.`;
    } else if (blocked.length > 0) {
      return greeting + `You mentioned being stuck on this:\n\n[task:${blocked[0].id}]\n\nWant to work through it?`;
    } else if (inProgress.length > 0) {
      return greeting + `How's this going?\n\n[task:${inProgress[0].id}]\n\nAnything I can help with?`;
    } else if (urgent.length > 0) {
      return greeting + `What actually matters right now:\n\n[task:${urgent[0].id}]\n\nMost other things can wait. Want me to walk you through this one?`;
    } else if (stats.completed > 0) {
      return greeting + `You've gotten ${stats.completed} thing${stats.completed === 1 ? "" : "s"} handled. Take a breath—what would help right now?`;
    } else {
      return greeting + "What would help right now?";
    }
  } else {
    // Navigating stage: "You've gotten through the hardest part."
    if (stats.total === 0) {
      return greeting + `You've gotten through the hardest part. Now it's about working through everything else at a sustainable pace. Where would you like to start?`;
    } else if (blocked.length > 0) {
      return greeting + `You mentioned being stuck on this:\n\n[task:${blocked[0].id}]\n\nWant to work through it?`;
    } else if (inProgress.length > 0) {
      return greeting + `How's this going?\n\n[task:${inProgress[0].id}]\n\nAnything I can help with?`;
    } else if (urgent.length > 0) {
      return greeting + `When you're ready, the next thing to focus on:\n\n[task:${urgent[0].id}]\n\nNo rush—want me to walk you through it?`;
    } else if (stats.completed > 0) {
      return greeting + `You've gotten ${stats.completed} thing${stats.completed === 1 ? "" : "s"} handled. There's no deadline on the rest. What feels manageable to work on?`;
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
