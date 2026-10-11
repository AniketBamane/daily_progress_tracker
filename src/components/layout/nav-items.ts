import { CalendarDays, LayoutDashboard, LineChart, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Insights", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
