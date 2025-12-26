import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { OnboardingData, TaskTemplate, TaskInsert } from "@/lib/supabase/types";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the onboarding data
    const data: OnboardingData = await request.json();

    // Validate required fields
    if (!data.userRole || !data.state || !data.deceasedName?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Update the user's profile with onboarding data
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        grief_stage: data.griefStage,
        user_role: data.userRole,
        state: data.state,
        deceased_name: data.deceasedName.trim(),
        deceased_had_spouse: data.deceasedHadSpouse,
        knows_will_status: data.knowsWillStatus,
        knows_trust_status: data.knowsTrustStatus,
        knows_property_status: data.knowsPropertyStatus,
        knows_accounts_status: data.knowsAccountsStatus,
        knows_insurance_status: data.knowsInsuranceStatus,
        has_surviving_parent: data.hasSurvivingParent,
        number_of_siblings: data.numberOfSiblings,
        check_in_frequency: data.checkInFrequency,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return NextResponse.json(
        { error: "Failed to save profile" },
        { status: 500 }
      );
    }

    // Fetch matching task templates based on user's situation
    const { data: templates, error: templatesError } = await supabase
      .from("task_templates")
      .select("*");

    if (templatesError) {
      console.error("Templates fetch error:", templatesError);
      // Continue without templates - profile is saved
    }

    // Filter templates based on user's situation
    // When status is 'unknown', we include the template (user will discover later)
    const isExecutor = data.userRole === "executor" || data.userRole === "co_executor";
    const matchingTemplates = (templates || []).filter((template: TaskTemplate) => {
      // Check each condition - if the template requires something, user must have it (or be unknown)
      if (template.requires_will && data.knowsWillStatus === "no") return false;
      if (template.requires_trust && data.knowsTrustStatus === "no") return false;
      if (template.requires_property && data.knowsPropertyStatus === "no") return false;
      if (template.requires_retirement_accounts && data.knowsAccountsStatus === "no") return false;
      if (template.requires_surviving_spouse && !data.deceasedHadSpouse) return false;
      if (template.requires_executor_role && !isExecutor) return false;
      return true;
    });

    // Create user tasks from matching templates
    if (matchingTemplates.length > 0) {
      const tasksToInsert: TaskInsert[] = matchingTemplates.map((template: TaskTemplate) => ({
        user_id: user.id,
        template_id: template.id,
        title: template.title,
        description: template.description,
        timeline_category: template.timeline_category,
        task_type: template.task_type,
        priority: template.priority,
        status: "pending" as const,
        why_it_matters: template.why_it_matters,
        documents_needed: template.documents_needed,
        tips: template.tips,
        is_paperwork_task: template.is_paperwork_task,
        paperwork_wizard_id: template.paperwork_wizard_id,
        due_date: template.days_after_death
          ? calculateDueDate(template.days_after_death)
          : null,
      }));

      const { error: tasksError } = await supabase
        .from("tasks")
        .insert(tasksToInsert);

      if (tasksError) {
        console.error("Tasks creation error:", tasksError);
        // Continue - profile is saved, tasks failed
      }
    }

    return NextResponse.json({
      success: true,
      tasksCreated: matchingTemplates.length,
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function calculateDueDate(daysAfterDeath: number): string {
  // For now, calculate from today. In production, you'd use the actual date of death.
  const date = new Date();
  date.setDate(date.getDate() + daysAfterDeath);
  return date.toISOString().split("T")[0];
}
