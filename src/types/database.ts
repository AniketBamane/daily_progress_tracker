// Hand-written types matching supabase/schema.sql.
// Once your Supabase project is live, you can regenerate exact types with:
//   npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
// This hand-written version keeps the app compiling before you've done that.

export type TaskStatus = "in_progress" | "done" | "skipped";
export type TaskPriority = "low" | "medium" | "high";
export type GoalPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          timezone: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          name: string;
          notes: string | null;
          start_time: string;
          end_time: string | null;
          duration_seconds: number | null;
          status: TaskStatus;
          priority: TaskPriority;
          is_running: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          period: GoalPeriod;
          target_minutes: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["goals"]["Row"]> & {
          user_id: string;
          period: GoalPeriod;
          target_minutes: number;
        };
        Update: Partial<Database["public"]["Tables"]["goals"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Goal = Database["public"]["Tables"]["goals"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type TaskWithCategory = Task & { category: Category | null };
