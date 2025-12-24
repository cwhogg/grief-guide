import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import immediateData from "../../../../docs/knowledge/tasks/immediate.json";
import firstWeekData from "../../../../docs/knowledge/tasks/first-week.json";
import firstMonthData from "../../../../docs/knowledge/tasks/first-month.json";
import ongoingData from "../../../../docs/knowledge/tasks/ongoing.json";

// One-time seed endpoint - remove after use
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Missing Supabase credentials" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const taskFiles = [
    { category: "immediate", tasks: immediateData.tasks },
    { category: "first_week", tasks: firstWeekData.tasks },
    { category: "first_month", tasks: firstMonthData.tasks },
    { category: "ongoing", tasks: ongoingData.tasks },
  ];

  const results = {
    inserted: 0,
    errors: [] as string[],
  };

  for (const file of taskFiles) {
    for (const task of file.tasks) {
      const templateData = {
        id: task.id,
        title: task.title,
        description: task.description,
        timeline_category: file.category,
        task_type: task.task_type,
        priority: task.priority,
        days_after_death: task.days_after_death,
        why_it_matters: task.why_it_matters,
        documents_needed: task.documents_needed,
        tips: task.tips,
        is_paperwork_task: task.is_paperwork_task,
        paperwork_wizard_id: task.paperwork_wizard_id,
        requires_will: task.requires_will,
        requires_trust: task.requires_trust,
        requires_property: task.requires_property,
        requires_retirement_accounts: task.requires_retirement_accounts,
        requires_surviving_spouse: task.requires_surviving_spouse,
        requires_executor_role: task.requires_executor_role,
      };

      const { error } = await supabase
        .from("task_templates")
        .upsert(templateData, { onConflict: "id" });

      if (error) {
        results.errors.push(`${task.title}: ${error.message}`);
      } else {
        results.inserted++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: `Seeded ${results.inserted} task templates`,
    errors: results.errors.length > 0 ? results.errors : undefined,
  });
}
