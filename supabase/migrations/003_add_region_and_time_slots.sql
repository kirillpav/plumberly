-- Add region column for London area selection
alter table public.enquiries add column if not exists region text;

-- Change preferred_time from text to text[] for multiple availability slots
alter table public.enquiries
  alter column preferred_time type text[]
  using case
    when preferred_time is not null then array[preferred_time]
    else '{}'::text[]
  end;

alter table public.enquiries
  alter column preferred_time set default '{}';
