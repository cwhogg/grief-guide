export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole =
  | "executor"
  | "co_executor"
  | "family_helper"
  | "spouse"
  | "only_child"
  | "other";

export type CheckInFrequency = "daily" | "weekly" | "as_needed";

export type GriefStage = "anticipating" | "immediate" | "navigating";

// Knowledge status for legal/financial information
// 'unknown' is the expected default - most people don't know this stuff
export type KnowledgeStatus = "yes" | "no" | "unknown";

export type TaskType =
  | "paperwork"
  | "legal"
  | "financial"
  | "notifications"
  | "logistics";

export type TimelineCategory =
  | "discovery"
  | "anticipating"
  | "immediate"
  | "first_week"
  | "first_month"
  | "ongoing";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          onboarding_completed: boolean;
          user_role: UserRole | null;
          state: string | null;
          deceased_name: string | null;
          deceased_had_spouse: boolean | null;
          // Knowledge status fields - 'unknown' is expected default
          knows_will_status: KnowledgeStatus;
          knows_trust_status: KnowledgeStatus;
          knows_property_status: KnowledgeStatus;
          knows_accounts_status: KnowledgeStatus;
          knows_insurance_status: KnowledgeStatus;
          has_surviving_parent: boolean | null;
          number_of_siblings: number | null;
          check_in_frequency: CheckInFrequency | null;
          grief_stage: GriefStage | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          user_role?: UserRole | null;
          state?: string | null;
          deceased_name?: string | null;
          deceased_had_spouse?: boolean | null;
          knows_will_status?: KnowledgeStatus;
          knows_trust_status?: KnowledgeStatus;
          knows_property_status?: KnowledgeStatus;
          knows_accounts_status?: KnowledgeStatus;
          knows_insurance_status?: KnowledgeStatus;
          has_surviving_parent?: boolean | null;
          number_of_siblings?: number | null;
          check_in_frequency?: CheckInFrequency | null;
          grief_stage?: GriefStage | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          user_role?: UserRole | null;
          state?: string | null;
          deceased_name?: string | null;
          deceased_had_spouse?: boolean | null;
          knows_will_status?: KnowledgeStatus;
          knows_trust_status?: KnowledgeStatus;
          knows_property_status?: KnowledgeStatus;
          knows_accounts_status?: KnowledgeStatus;
          knows_insurance_status?: KnowledgeStatus;
          has_surviving_parent?: boolean | null;
          number_of_siblings?: number | null;
          check_in_frequency?: CheckInFrequency | null;
          grief_stage?: GriefStage | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_templates: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          timeline_category: TimelineCategory;
          task_type: TaskType;
          priority: number;
          days_after_death: number | null;
          why_it_matters: string | null;
          documents_needed: string[] | null;
          tips: string[] | null;
          is_paperwork_task: boolean;
          paperwork_wizard_id: string | null;
          requires_will: boolean | null;
          requires_trust: boolean | null;
          requires_property: boolean | null;
          requires_retirement_accounts: boolean | null;
          requires_surviving_spouse: boolean | null;
          requires_executor_role: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          timeline_category: TimelineCategory;
          task_type: TaskType;
          priority?: number;
          days_after_death?: number | null;
          why_it_matters?: string | null;
          documents_needed?: string[] | null;
          tips?: string[] | null;
          is_paperwork_task?: boolean;
          paperwork_wizard_id?: string | null;
          requires_will?: boolean | null;
          requires_trust?: boolean | null;
          requires_property?: boolean | null;
          requires_retirement_accounts?: boolean | null;
          requires_surviving_spouse?: boolean | null;
          requires_executor_role?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          timeline_category?: TimelineCategory;
          task_type?: TaskType;
          priority?: number;
          days_after_death?: number | null;
          why_it_matters?: string | null;
          documents_needed?: string[] | null;
          tips?: string[] | null;
          is_paperwork_task?: boolean;
          paperwork_wizard_id?: string | null;
          requires_will?: boolean | null;
          requires_trust?: boolean | null;
          requires_property?: boolean | null;
          requires_retirement_accounts?: boolean | null;
          requires_surviving_spouse?: boolean | null;
          requires_executor_role?: boolean | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          template_id: string | null;
          title: string;
          description: string | null;
          timeline_category: TimelineCategory;
          task_type: TaskType;
          status: "pending" | "in_progress" | "completed" | "skipped" | "blocked";
          priority: number;
          due_date: string | null;
          completed_at: string | null;
          notes: string | null;
          why_it_matters: string | null;
          documents_needed: string[] | null;
          tips: string[] | null;
          is_paperwork_task: boolean;
          paperwork_wizard_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          template_id?: string | null;
          title: string;
          description?: string | null;
          timeline_category: TimelineCategory;
          task_type: TaskType;
          status?: "pending" | "in_progress" | "completed" | "skipped" | "blocked";
          priority?: number;
          due_date?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          why_it_matters?: string | null;
          documents_needed?: string[] | null;
          tips?: string[] | null;
          is_paperwork_task?: boolean;
          paperwork_wizard_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          template_id?: string | null;
          title?: string;
          description?: string | null;
          timeline_category?: TimelineCategory;
          task_type?: TaskType;
          status?: "pending" | "in_progress" | "completed" | "skipped" | "blocked";
          priority?: number;
          due_date?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          why_it_matters?: string | null;
          documents_needed?: string[] | null;
          tips?: string[] | null;
          is_paperwork_task?: boolean;
          paperwork_wizard_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "task_templates";
            referencedColumns: ["id"];
          }
        ];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          agent_type: "general" | "legal" | "financial" | "emotional";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          agent_type?: "general" | "legal" | "financial" | "emotional";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          agent_type?: "general" | "legal" | "financial" | "emotional";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          }
        ];
      };
      resources: {
        Row: {
          id: string;
          title: string;
          content: string;
          category: "legal" | "financial" | "emotional" | "practical";
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          category: "legal" | "financial" | "emotional" | "practical";
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          category?: "legal" | "financial" | "emotional" | "practical";
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      timeline_category: TimelineCategory;
      task_type: TaskType;
      task_status: "pending" | "in_progress" | "completed" | "skipped" | "blocked";
      agent_type: "general" | "legal" | "financial" | "emotional";
      message_role: "user" | "assistant" | "system";
      resource_category: "legal" | "financial" | "emotional" | "practical";
      user_role: UserRole;
      check_in_frequency: CheckInFrequency;
    };
    CompositeTypes: {};
  };
};

// Helper types for easier usage
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type TaskTemplate = Database["public"]["Tables"]["task_templates"]["Row"];
export type TaskTemplateInsert =
  Database["public"]["Tables"]["task_templates"]["Insert"];

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
export type TaskStatus = Task["status"];

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationInsert =
  Database["public"]["Tables"]["conversations"]["Insert"];
export type ConversationUpdate =
  Database["public"]["Tables"]["conversations"]["Update"];
export type AgentType = Conversation["agent_type"];

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];
export type MessageUpdate = Database["public"]["Tables"]["messages"]["Update"];
export type MessageRole = Message["role"];

export type Resource = Database["public"]["Tables"]["resources"]["Row"];
export type ResourceInsert = Database["public"]["Tables"]["resources"]["Insert"];
export type ResourceUpdate = Database["public"]["Tables"]["resources"]["Update"];
export type ResourceCategory = Resource["category"];

// Onboarding form data type
export interface OnboardingData {
  griefStage: GriefStage;
  userRole: UserRole;
  state: string;
  deceasedName: string;
  deceasedHadSpouse: boolean;
  // Knowledge status - 'unknown' is the expected default
  knowsLegalFinancialSituation: "full" | "partial" | "none";
  knowsWillStatus: KnowledgeStatus;
  knowsTrustStatus: KnowledgeStatus;
  knowsPropertyStatus: KnowledgeStatus;
  knowsAccountsStatus: KnowledgeStatus;
  knowsInsuranceStatus: KnowledgeStatus;
  hasSurvivingParent: boolean;
  numberOfSiblings: number;
  checkInFrequency: CheckInFrequency;
}

// Task filter options
export interface TaskFilters {
  status: TaskStatus[];
  taskType: TaskType[];
  timelineCategory: TimelineCategory[];
}
