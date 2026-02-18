-- Add scheduled_time column so plumber can pick a time slot when quoting
alter table public.jobs add column if not exists scheduled_time text;
