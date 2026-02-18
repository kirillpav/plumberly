-- Enable Supabase Realtime for enquiries and jobs tables
-- Tables must be added to the supabase_realtime publication for
-- postgres_changes subscriptions to work.
alter publication supabase_realtime add table public.enquiries;
alter publication supabase_realtime add table public.jobs;
