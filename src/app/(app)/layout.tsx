import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CategoriesProvider } from "@/contexts/categories-context";
import { TasksProvider } from "@/contexts/tasks-context";
import { AppShell } from "@/components/layout/app-shell";
import { todayRange } from "@/lib/utils/time";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { start, end } = todayRange();

  const [{ data: categories }, { data: profile }, { data: todayTasks }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("tasks")
      .select("*")
      .gte("start_time", start)
      .lt("start_time", end)
      .order("start_time", { ascending: false }),
  ]);

  return (
    <CategoriesProvider initialCategories={categories ?? []} userId={user.id}>
      <TasksProvider initialTasks={todayTasks ?? []} userId={user.id}>
        <AppShell fullName={profile?.full_name ?? null} email={user.email ?? ""}>
          {children}
        </AppShell>
      </TasksProvider>
    </CategoriesProvider>
  );
}
