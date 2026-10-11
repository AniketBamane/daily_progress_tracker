import { createClient } from "@/lib/supabase/server";
import { lastNDaysRange } from "@/lib/utils/time";
import { AnalyticsView } from "@/components/analytics/analytics-view";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { start } = lastNDaysRange(365);
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user!.id)
    .gte("start_time", start)
    .order("start_time", { ascending: true });

  return <AnalyticsView tasks={tasks ?? []} />;
}
