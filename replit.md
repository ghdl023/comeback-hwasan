# 화산귀환 (comback-hwasan) - 운동 기록 트래커

## Overview
Next.js 15 (App Router) + TypeScript web app for personal fitness/weight workout tracking.
Uses Firebase (Firestore + Firebase Auth) as the backend. No custom server — frontend-only deployment.
App name: comback-hwasan (화산귀환). Plum blossom (매화) logo theme.
Primary target: mobile devices (mobile-first responsive design with bottom tab navigation).

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Firebase (Firestore for data, Firebase Auth for authentication)
- **Auth**: Google OAuth popup via Firebase Auth (client-side only)
- **Deployment Target**: Vercel (frontend-only)

## Project Structure
```
app/                    - Next.js pages (App Router)
  layout.tsx            - Root layout
  page.tsx              - Root redirect to /login
  login/page.tsx        - Login page (Google OAuth)
  dashboard/            - Dashboard (vertical calendar + expandable detail panel at bottom)
  workouts/             - Workout CRUD (list/create/detail)
    date/[date]/page.tsx - Date-based workout detail (standalone, kept for direct link)
    new/page.tsx        - New workout with exercise selector (redirects back to dashboard)
  exercises/            - Exercise library management
components/             - React components
  auth-provider.tsx     - Firebase Auth context provider (Google popup)
  auth-guard.tsx        - Client-side route protection
  client-providers.tsx  - Client-side providers wrapper (hydration fix)
  app-shell.tsx         - Shared layout wrapper with hamburger header and side panel
  side-panel.tsx        - Slide-out side navigation panel (user info, menu, logout)
  navbar.tsx            - (deprecated, kept for reference)
  exercise-selector.tsx - Full-screen exercise selection (muscle group → exercise → sub-exercise)
  plum-blossom.tsx      - Plum blossom SVG logo
  theme-provider.tsx    - Dark mode provider
  ui/                   - shadcn/ui base components
lib/
  firebase/config.ts    - Firebase app/auth/db initialization
  firebase/firestore.ts - Firestore CRUD functions
  types.ts              - TypeScript types, muscle groups, exercise categories
  utils.ts              - Utility functions (cn)
middleware.ts           - Next.js middleware (passthrough — auth is client-side)
```

## Firestore Collections
- `users` - User profiles (uid, email, display_name, photo_url, created_at, last_login_at)
- `exercises` - User's exercise library (user_id, name, category, muscle_group, parent_id, created_at)
  - Supports hierarchical structure: muscle_group → parent exercise → sub-exercises via parent_id
- `workouts` - Workout sessions (user_id, title, performed_at, duration_minutes, notes, created_at)
- `workout_sets` - Sets within workouts (workout_id, exercise_id, set_number, reps, weight, created_at)
- `body_records` - Daily body measurements (user_id, date, weight, skeletal_muscle, body_fat, created_at)
  - Doc ID: `{user_id}_{date}` for deterministic upsert (no duplicates)

## Muscle Groups (13)
목, 승모근, 어깨, 가슴, 등, 삼두, 이두, 전완, 복부, 허리, 엉덩이, 하체, 종아리

## Exercise Selector Flow
1. Full-screen overlay with fixed header (back, search, add) and fixed footer (selected exercises)
2. Body shows 13 muscle groups with exercise counts
3. Click muscle group → shows exercises for that group (parent_id=null)
4. Click exercise → shows sub-exercises (parent_id=exercise.id)
5. Select sub-exercise → adds to footer selection list
6. Confirm → returns selected exercises to workout form

## Environment Variables
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID

## Firebase Console Setup Required
1. Enable Google sign-in provider in Firebase Auth
2. Add Replit/Vercel domains to authorized domains in Firebase Auth
3. Create Firestore database and set security rules (per-user access: `request.auth.uid == resource.data.user_id`)
4. Create composite indexes for Firestore queries as needed

## Development Notes
- Workflow: `next dev -p 5000 -H 0.0.0.0`
- Route protection is **client-side only** via `AuthGuard` component
- `.npmrc` has `legacy-peer-deps=true` to resolve framer-motion ↔ React 19 peer dependency conflict
- Hydration mismatch warning in dev is a Replit iframe proxy artifact (harmless in production)
- `getWorkoutSetsByUser()` fetches sets in chunks of 30 (Firestore `in` query limit)
- All UI text is in Korean (한국어)
- Navigation via `AppShell` (hamburger header) + `SidePanel` (slide-out drawer)
- Safe area insets handled for iOS notch devices
- Dashboard detail panel: expandable bottom panel (not separate route), toggles open/closed with fast animation (0.2s), calendar collapses when panel opens
- Detail panel header: toggle icon (up/down), date, today button, routine placeholder — same elements in both states
- Body info section (체중/골격근량/체지방) with debounced auto-save per selected date
