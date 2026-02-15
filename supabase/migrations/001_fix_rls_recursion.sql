-- Migration: Fix infinite recursion in RLS policies
--
-- PROBLEM: The "Plumbers can view customer profiles for their jobs" policy
-- on the profiles table contained a subquery that referenced the profiles
-- table itself (SELECT ... FROM public.profiles p WHERE p.id = auth.uid()).
-- This caused PostgreSQL to detect infinite recursion whenever ANY query
-- touched the profiles table — breaking fetchProfile, fetchEnquiries, etc.
--
-- Additionally, policies on enquiries and plumber_details referenced the
-- profiles table in subqueries, which also triggered the recursive profiles
-- RLS evaluation.
--
-- FIX: Create SECURITY DEFINER helper functions that bypass RLS when
-- checking a user's role or looking up job relationships. Then rewrite
-- all cross-table policies to use these functions instead of inline subqueries.
--
-- HOW TO RUN: Paste this into the Supabase Dashboard → SQL Editor and click Run.

-- =========================================================
-- 1. Create SECURITY DEFINER helper functions
-- =========================================================
create or replace function public.is_plumber()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'plumber'
  );
$$ language sql security definer stable;

create or replace function public.is_customer()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'customer'
  );
$$ language sql security definer stable;

create or replace function public.get_plumber_customer_ids(plumber_uuid uuid)
returns setof uuid as $$
  select customer_id from public.jobs where plumber_id = plumber_uuid;
$$ language sql security definer stable;

-- =========================================================
-- 2. Fix profiles policy (was self-referencing → infinite recursion)
-- =========================================================
drop policy if exists "Plumbers can view customer profiles for their jobs" on public.profiles;

create policy "Plumbers can view customer profiles for their jobs" on public.profiles
  for select using (
    role = 'customer'
    and public.is_plumber()
    and id in (select public.get_plumber_customer_ids(auth.uid()))
  );

-- =========================================================
-- 3. Fix enquiries policy (was referencing profiles inline)
-- =========================================================
drop policy if exists "Plumbers can view all enquiries" on public.enquiries;

create policy "Plumbers can view all enquiries" on public.enquiries
  for select using (public.is_plumber());

-- =========================================================
-- 4. Fix plumber_details policy (was referencing profiles inline)
-- =========================================================
drop policy if exists "Customers can view plumber details" on public.plumber_details;

create policy "Customers can view plumber details" on public.plumber_details
  for select using (public.is_customer());
