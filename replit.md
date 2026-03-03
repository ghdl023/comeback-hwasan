# FitLog - Personal Workout Tracker

## Overview
Next.js 15 (App Router) + TypeScript 웹앱. 개인 헬스/웨이트 운동기록 앱.
Supabase를 백엔드/DB로 사용하며, 별도 커스텀 서버 없음.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Auth**: Google OAuth via Supabase Auth
- **Deployment Target**: Vercel

## Project Structure
```
app/                    - Next.js pages (App Router)
  layout.tsx            - Root layout
  page.tsx              - Landing page
  login/page.tsx        - Login page (Google OAuth)
  auth/callback/route.ts - OAuth callback handler
  dashboard/            - Dashboard (stats, recent workouts)
  workouts/             - Workout CRUD (list/create/detail)
  exercises/            - Exercise library management
components/             - React components
  auth-provider.tsx     - Auth context provider
  navbar.tsx            - Top navigation bar
  theme-provider.tsx    - Dark mode provider
  ui/                   - shadcn/ui base components
lib/
  supabase/client.ts    - Browser Supabase client
  supabase/server.ts    - Server Supabase client
  supabase/middleware.ts - Middleware session helper
  types.ts              - TypeScript types
  utils.ts              - Utility functions (cn)
middleware.ts           - Next.js middleware (auth, session refresh)
supabase/schema.sql     - DB schema + RLS policies
```

## Database Tables
- `exercises` - User's exercise library
- `workouts` - Workout sessions
- `workout_sets` - Sets within workouts

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key

## Development
- Workflow: `next dev -p 5000 -H 0.0.0.0`
- All protected routes require authentication
- Middleware handles session refresh and route protection
