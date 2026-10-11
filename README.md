# Momentum — Daily Task & Progress Tracker

Log your day in seconds, then watch your growth with monthly/yearly charts and KPIs.
Built with **Next.js (App Router)**, **Supabase** (Postgres + Auth + Realtime), **Tailwind + shadcn/ui**,
and a natural-language quick-add bar so logging a task never feels like filling out a form.

## Features

- **Email/password, magic link, and Google OAuth** authentication (Supabase Auth + Row Level Security)
- **Natural-language quick add**: type `"Gym 7-8am #health"` or `"Deep work 90m !!"` and it parses the
  time, duration, category, and priority automatically. Leave out the time entirely and it starts a live timer.
- **One timer at a time**, with a persistent live counter in the header
- **Swipe-to-complete / swipe-to-delete** on mobile, with undo toasts instead of confirm dialogs
- **Realtime sync** across tabs/devices via Supabase Realtime
- **Week calendar view**, day drill-down
- **Insights dashboard**: KPIs, hours-by-day/month trend chart, category breakdown donut,
  a GitHub-style yearly activity heatmap, and plain-English week/month/year comparisons
- **Fully responsive**: sidebar + persistent quick-add on desktop, bottom nav + FAB quick-add sheet on mobile
- **Dark/light mode**, keyboard shortcuts (`n` or `⌘/Ctrl+K` to jump to quick-add)
- CVD-safe, validated chart color palette (see `src/app/globals.css` and `src/hooks/use-categories.ts`)

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy the **Project URL** and **anon public key**.
3. Copy `.env.local.example` to `.env.local` and fill in those two values:

   ```bash
   cp .env.local.example .env.local
   ```

4. Open **SQL Editor** in the Supabase dashboard, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates all tables
   (`profiles`, `categories`, `tasks`, `goals`), Row Level Security policies, a trigger that
   seeds four starter categories for every new user, and enables Realtime on `tasks`.

5. (Optional, for Google sign-in) In **Authentication → Providers**, enable Google and add your
   OAuth client ID/secret. In **Authentication → URL Configuration**, make sure
   `http://localhost:3000/auth/callback` (and your production URL's equivalent) is an allowed redirect URL.

## 2. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`. Sign up with
email/password (or Google, if configured) and you're in.

## 3. Project structure

```
src/
  app/
    (auth)/login, (auth)/signup   — public auth pages
    auth/callback                 — OAuth/magic-link redirect handler
    (app)/                        — protected app shell (layout fetches user + categories + today's tasks)
      page.tsx                    — Today dashboard
      calendar/                   — week view
      analytics/                  — KPI + charts dashboard
      settings/                   — profile, categories, sign out
  components/
    quick-add/quick-add-bar.tsx   — the natural-language quick-add input
    tasks/                        — active timer bar, swipeable task item/list
    analytics/                    — donut, trend bar chart, yearly heatmap
    layout/                       — responsive app shell (sidebar / bottom nav)
  contexts/                       — TasksProvider / CategoriesProvider (realtime-synced state)
  hooks/use-tasks.ts, use-categories.ts  — optimistic CRUD + Supabase Realtime subscriptions
  lib/supabase/                   — browser / server / middleware Supabase clients
  lib/utils/parse-quick-add.ts    — the natural-language parser (chrono-node based)
  lib/utils/analytics.ts          — daily/category/weekday aggregation helpers
supabase/schema.sql               — full DB schema + RLS policies + seed trigger
```

## 4. Regenerating exact Supabase types (optional)

`src/types/database.ts` is hand-written to match `supabase/schema.sql`. Once your project is live you
can replace it with generated types for perfect accuracy:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```

## Deploying

Any Next.js host works (Vercel is the simplest). Set the two `NEXT_PUBLIC_SUPABASE_*` env vars in your
host's dashboard, and add your production domain's `/auth/callback` URL to Supabase's allowed redirect list.
