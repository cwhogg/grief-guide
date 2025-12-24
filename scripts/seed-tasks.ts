/**
 * Seed Script for Task Templates
 *
 * This script loads task template JSON files and inserts them into Supabase.
 *
 * Usage:
 *   npm run seed:tasks
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY - Your anon key (already in .env.local)
 *
 * Optional:
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (bypasses RLS if needed)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local (Next.js convention)
import { config } from "dotenv";
config({ path: ".env.local" });

interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  task_type: "paperwork" | "legal" | "financial" | "notifications" | "logistics";
  priority: number;
  days_after_death: number | null;
  why_it_matters: string;
  documents_needed: string[];
  tips: string[];
  estimated_time: string;
  is_paperwork_task: boolean;
  paperwork_wizard_id: string | null;
  requires_will: boolean;
  requires_trust: boolean;
  requires_property: boolean;
  requires_retirement_accounts: boolean;
  requires_surviving_spouse: boolean;
  requires_executor_role: boolean;
}

interface TaskFile {
  category: "immediate" | "first_week" | "first_month" | "ongoing";
  description: string;
  tasks: TaskTemplate[];
}

const TASK_FILES = [
  "immediate.json",
  "first-week.json",
  "first-month.json",
  "ongoing.json",
];

async function loadTaskFiles(): Promise<TaskFile[]> {
  const tasksDir = path.join(process.cwd(), "docs", "knowledge", "tasks");
  const taskFiles: TaskFile[] = [];

  for (const fileName of TASK_FILES) {
    const filePath = path.join(tasksDir, fileName);
    console.log(`Loading ${fileName}...`);

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const taskFile: TaskFile = JSON.parse(fileContent);
      taskFiles.push(taskFile);
      console.log(`  Found ${taskFile.tasks.length} tasks in ${taskFile.category}`);
    } catch (error) {
      console.error(`  Error loading ${fileName}:`, error);
      throw error;
    }
  }

  return taskFiles;
}

async function seedTasks() {
  console.log("\n=== Task Template Seed Script ===\n");

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use service role key if available, otherwise fall back to anon key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Missing required environment variables.");
    console.error("Required:");
    console.error("  - NEXT_PUBLIC_SUPABASE_URL");
    console.error("  - NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)");
    console.error("\nMake sure these are set in your .env.local file.");
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("Connected to Supabase.\n");

  // Load task files
  const taskFiles = await loadTaskFiles();

  // Calculate totals
  const totalTasks = taskFiles.reduce((sum, file) => sum + file.tasks.length, 0);
  console.log(`\nTotal tasks to seed: ${totalTasks}\n`);

  // Check for existing tasks
  const { count: existingCount } = await supabase
    .from("task_templates")
    .select("*", { count: "exact", head: true });

  if (existingCount && existingCount > 0) {
    console.log(`Found ${existingCount} existing task templates.`);
    console.log("Do you want to clear existing templates and reseed? (Use --force flag)\n");

    if (!process.argv.includes("--force")) {
      console.log("Checking for updates only...\n");
    } else {
      console.log("--force flag detected. Clearing existing templates...\n");
      const { error: deleteError } = await supabase
        .from("task_templates")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (deleteError) {
        console.error("Error clearing templates:", deleteError);
        process.exit(1);
      }
      console.log("Existing templates cleared.\n");
    }
  }

  // Insert tasks
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const taskFile of taskFiles) {
    console.log(`\nProcessing ${taskFile.category}...`);

    for (const task of taskFile.tasks) {
      const templateData = {
        id: task.id,
        title: task.title,
        description: task.description,
        timeline_category: taskFile.category,
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

      // Upsert (insert or update)
      const { error } = await supabase
        .from("task_templates")
        .upsert(templateData, {
          onConflict: "id",
        });

      if (error) {
        console.error(`  Error inserting "${task.title}":`, error.message);
        errors++;
      } else {
        // Check if it was insert or update
        const { data: existing } = await supabase
          .from("task_templates")
          .select("created_at")
          .eq("id", task.id)
          .single();

        if (existing) {
          console.log(`  ✓ ${task.title}`);
          inserted++;
        }
      }
    }
  }

  // Summary
  console.log("\n=== Seed Complete ===\n");
  console.log(`Tasks processed: ${inserted + updated + errors}`);
  console.log(`  Inserted/Updated: ${inserted + updated}`);
  if (errors > 0) {
    console.log(`  Errors: ${errors}`);
  }
  console.log("");

  // Verify final count
  const { count: finalCount } = await supabase
    .from("task_templates")
    .select("*", { count: "exact", head: true });

  console.log(`Total templates in database: ${finalCount}`);

  // Show breakdown by category
  console.log("\nBreakdown by category:");
  for (const category of ["immediate", "first_week", "first_month", "ongoing"]) {
    const { count } = await supabase
      .from("task_templates")
      .select("*", { count: "exact", head: true })
      .eq("timeline_category", category);
    console.log(`  ${category}: ${count}`);
  }

  console.log("\nDone!");
}

// Run the seed
seedTasks().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
