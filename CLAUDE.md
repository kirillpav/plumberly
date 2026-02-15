# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plumberly is a two-sided marketplace React Native (Expo) app connecting customers with plumbers in the UK. Customers interact with an AI chatbot for plumbing diagnosis, create enquiries, and browse plumbers on a map. Plumbers manage jobs, submit quotes, and track performance on a dashboard.

## Commands

- `npx expo start` — Start the Expo dev server
- `npx expo start --ios` / `--android` / `--web` — Start on a specific platform
- `npx expo install <package>` — Install Expo-compatible package versions

There is no linter, formatter, or test runner configured.

## Architecture

### Tech Stack
- **Framework:** React Native 0.81 + Expo SDK 54
- **Language:** TypeScript with `@/*` path alias → `src/*`
- **State:** Zustand stores (src/store/) — auth, enquiry, job, chat
- **Backend:** Supabase (Postgres + Auth + Storage) — schema in `supabase/schema.sql`
- **Navigation:** React Navigation (native-stack + bottom-tabs)
- **AI:** OpenAI GPT-4o streaming via AsyncGenerator (src/lib/openai.ts)
- **Maps:** react-native-maps + Google Maps API

### Two-Role Architecture
The app conditionally renders entirely different tab navigators based on `UserRole`:
- **Customer flow:** Chatbot → Enquiries → Map → Account
- **Plumber flow:** Jobs → Dashboard → Account

Navigation is defined in `src/navigation/` with `RootNavigator` checking auth state and role to choose between `AuthNavigator`, `CustomerTabNavigator`, or `PlumberTabNavigator`.

### Data Flow
1. **Auth:** Supabase Auth with secure token storage (expo-secure-store). A Postgres trigger auto-creates `profiles` and `plumber_details` rows on signup.
2. **Enquiries:** Customers create enquiries (optionally with chatbot transcript + photos). Stored in Supabase with real-time subscriptions.
3. **Jobs:** Plumbers accept enquiries → creates a job. Status progression: pending → quoted → accepted → in_progress → completed.
4. **Real-time:** Stores subscribe to Supabase Postgres changes for live updates.

### Key Directories
- `src/screens/customer/` — 7 customer screens (Chatbot, Enquiries, NewEnquiry, EnquiryDetail, Map, Account, EditProfile)
- `src/screens/plumber/` — 6 plumber screens (Jobs, JobDetail, Dashboard, Account, EditProfile, BankDetails)
- `src/screens/auth/` — SignIn, CreateAccount, PlumberRegistration
- `src/components/` — Shared UI components (ScreenWrapper, PrimaryButton, InputField, SegmentedControl, etc.)
- `src/store/` — Zustand stores with real-time Supabase subscriptions
- `src/lib/` — Supabase client, OpenAI streaming, storage upload helpers
- `src/constants/` — Design tokens: colors (primary #3B7EF6), typography (Inter font), spacing scale

### Environment Variables
Required in `.env.local` with `EXPO_PUBLIC_` prefix:
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_OPENAI_API_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

### Conventions
- Functional components with `StyleSheet.create` for styles
- Typography styles applied via spread (`...Typography.h1`)
- Currency is GBP (£), formatted via `src/utils/formatCurrency.ts`
- Form validation via `src/utils/validation.ts` with composable rules
- `useAuth` hook (src/hooks/useAuth.ts) provides derived booleans: `isAuthenticated`, `isCustomer`, `isPlumber`
