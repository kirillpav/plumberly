-- Add dual-confirmation columns for job completion
alter table public.jobs add column if not exists customer_confirmed boolean default false not null;
alter table public.jobs add column if not exists plumber_confirmed boolean default false not null;

-- Allow customers to update their own jobs (needed for confirming completion)
create policy "Customers can update own jobs" on public.jobs
  for update using (auth.uid() = customer_id);
