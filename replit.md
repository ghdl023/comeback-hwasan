# FitLog - Personal Workout Tracker

## Overview
Next.js 15 (App Router) + TypeScript web app for personal fitness/weight workout tracking.
Uses Firebase (Firestore + Firebase Auth) as the backend. No custom server — frontend-only deployment.

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
  page.tsx              - Landing page
  login/page.tsx        - Login page (Google OAuth)
  dashboard/            - Dashboard (stats, recent workouts)
  workouts/             - Workout CRUD (list/create/detail)
  exercises/            - Exercise library management
components/             - React components
  auth-provider.tsx     - Firebase Auth context provider (Google popup)
  auth-guard.tsx        - Client-side route protection
  client-providers.tsx  - Client-side providers wrapper (hydration fix)
  navbar.tsx            - Top navigation bar
  theme-provider.tsx    - Dark mode provider
  ui/                   - shadcn/ui base components
lib/
  firebase/config.ts    - Firebase app/auth/db initialization
  firebase/firestore.ts - Firestore CRUD functions
  types.ts              - TypeScript types (Exercise, Workout, WorkoutSet)
  utils.ts              - Utility functions (cn)
middleware.ts           - Next.js middleware (passthrough — auth is client-side)
```

## Firestore Collections
- `exercises` - User's exercise library (fields: user_id, name, category, muscle_group, created_at)
- `workouts` - Workout sessions (fields: user_id, title, performed_at, duration_minutes, notes, created_at)
- `workout_sets` - Sets within workouts (fields: workout_id, exercise_id, set_number, reps, weight, created_at)

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
