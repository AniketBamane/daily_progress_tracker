import { createClient } from "@/lib/supabase/server";
import { lastNDaysRange, dayKey, calculateStreak } from "@/lib/utils/time";
import { TodayView } from "@/components/today/today-view";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { start } = lastNDaysRange(60);
  const { data: recentTasks } = await supabase
    .from("tasks")
    .select("start_time")
    .eq("user_id", user!.id)
    .gte("start_time", start);

  const activeDays = new Set((recentTasks ?? []).map((t) => dayKey(t.start_time)));
  const streak = calculateStreak(activeDays);

  return <TodayView streak={streak} />;
}
