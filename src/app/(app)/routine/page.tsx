import { createClient } from "@/lib/supabase/server";
import { RoutineView } from "@/components/routine/routine-view";

export default async function RoutinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: items } = await supabase
    .from("routine_items")
    .select("*")
    .order("start_minute", { ascending: true });

  return <RoutineView initialItems={items ?? []} userId={user!.id} />;
}
