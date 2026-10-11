import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <CalendarView userId={user!.id} />;
}
