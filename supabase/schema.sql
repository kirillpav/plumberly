-- Plumberly Database Schema (consolidated — includes all migrations 001–019)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =========================================================
-- PROFILES
-- =========================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  phone text,
  avatar_url text,
  role text not null check (role in ('customer', 'plumber')),
  push_token text,
  onboarding_complete boolean default false not null,
  is_admin boolean not null default false,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- NOTE: plumber->customer profile access policy is defined AFTER public.jobs exists.

-- =========================================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- These bypass RLS to avoid infinite recursion when policies
-- on one table need to check data in another RLS-protected table.
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

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  );
$$ language sql security definer stable;

-- =========================================================
-- PLUMBER DETAILS
-- =========================================================
create table public.plumber_details (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  regions text[] default '{}',
  hourly_rate numeric(10,2) default 0,
  bio text,
  verified boolean default false,
  rating numeric(3,2) default 0,
  jobs_completed integer default 0,
  business_name text not null default '',
  services_type text check (services_type in ('gas', 'no_gas')) default 'no_gas',
  gas_safe_number text,
  gas_safe_verified boolean default false,
  consent_to_checks boolean default false,
  right_to_work text,
  status text check (status in ('provisional', 'active', 'frozen', 'suspended')) default 'provisional',
  provisional_jobs_remaining integer default 5,
  payouts_enabled boolean default false,
  frozen_reason text,
  business_type text check (business_type in ('sole_trader', 'limited_company')),
  vetting_metadata jsonb default '{}'
);

alter table public.plumber_details enable row level security;

create policy "Plumbers can view own details" on public.plumber_details
  for select using (auth.uid() = user_id);

create policy "Plumbers can update own details" on public.plumber_details
  for update using (auth.uid() = user_id);

create policy "Customers can view plumber details" on public.plumber_details
  for select using (public.is_customer());

-- =========================================================
-- ENQUIRIES
-- =========================================================
create table public.enquiries (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  status text not null default 'new'
    check (status in ('new', 'accepted', 'in_progress', 'completed', 'cancelled')),
  region text,
  preferred_date date,
  preferred_time text[] default '{}',
  images text[] default '{}',
  chatbot_transcript jsonb,
  address_line_1 text not null default '',
  address_line_2 text,
  city text not null default 'London',
  postcode text not null default '',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.enquiries enable row level security;

create policy "Customers can view own enquiries" on public.enquiries
  for select using (auth.uid() = customer_id);

create policy "Customers can create enquiries" on public.enquiries
  for insert with check (auth.uid() = customer_id);

create policy "Customers can update own enquiries" on public.enquiries
  for update using (auth.uid() = customer_id);

create policy "Customers can delete own enquiries" on public.enquiries
  for delete using (auth.uid() = customer_id);

create policy "Plumbers can view all enquiries" on public.enquiries
  for select using (public.is_plumber());

-- =========================================================
-- JOBS
-- =========================================================
create table public.jobs (
  id uuid default uuid_generate_v4() primary key,
  enquiry_id uuid references public.enquiries(id) on delete cascade not null,
  customer_id uuid references public.profiles(id) not null,
  plumber_id uuid references public.profiles(id) not null,
  status text not null default 'pending'
    check (status in ('pending', 'quoted', 'declined', 'accepted', 'deposit_paid', 'in_progress', 'completed', 'cancelled')),
  quote_amount numeric(10,2),
  scheduled_date date,
  scheduled_time text,
  notes text,
  quote_description text,
  customer_confirmed boolean default false not null,
  plumber_confirmed boolean default false not null,
  verification_pin text,
  pin_verified boolean default false not null,
  platform_fee_multiplier integer not null default 1,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.jobs enable row level security;

create policy "Plumbers can view own jobs" on public.jobs
  for select using (auth.uid() = plumber_id);

create policy "Customers can view own jobs" on public.jobs
  for select using (auth.uid() = customer_id);

create policy "Plumbers can create jobs" on public.jobs
  for insert with check (auth.uid() = plumber_id);

create policy "Plumbers can update own jobs" on public.jobs
  for update using (auth.uid() = plumber_id);

create policy "Customers can update own jobs" on public.jobs
  for update using (auth.uid() = customer_id);

-- =========================================================
-- PROFILES POLICY THAT DEPENDS ON JOBS (moved here)
-- Uses SECURITY DEFINER helpers to avoid self-referencing recursion.
-- =========================================================
create policy "Plumbers can view customer profiles for their jobs" on public.profiles
  for select using (
    role = 'customer'
    and public.is_plumber()
    and id in (select public.get_plumber_customer_ids(auth.uid()))
  );

-- =========================================================
-- ADMIN RLS POLICIES
-- =========================================================
create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());

create policy "Admins can view all plumber details" on public.plumber_details
  for select using (public.is_admin());

create policy "Admins can update all plumber details" on public.plumber_details
  for update using (public.is_admin());

create policy "Admins can view all enquiries" on public.enquiries
  for select using (public.is_admin());

create policy "Admins can view all jobs" on public.jobs
  for select using (public.is_admin());

-- =========================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =========================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );

  -- If plumber, also create plumber_details
  if coalesce(new.raw_user_meta_data->>'role', 'customer') = 'plumber' then
    insert into public.plumber_details (
      user_id, regions, hourly_rate, business_name, services_type,
      gas_safe_number, consent_to_checks, right_to_work,
      business_type, vetting_metadata
    )
    values (
      new.id,
      case
        when new.raw_user_meta_data->'regions' is not null
             and jsonb_typeof(new.raw_user_meta_data->'regions') = 'array'
        then array(select jsonb_array_elements_text(new.raw_user_meta_data->'regions'))
        else '{}'::text[]
      end,
      coalesce((new.raw_user_meta_data->>'hourly_rate')::numeric, 0),
      coalesce(new.raw_user_meta_data->>'business_name', ''),
      coalesce(new.raw_user_meta_data->>'services_type', 'no_gas'),
      new.raw_user_meta_data->>'gas_safe_number',
      coalesce((new.raw_user_meta_data->>'consent_to_checks')::boolean, false),
      new.raw_user_meta_data->>'right_to_work',
      new.raw_user_meta_data->>'business_type',
      case
        when new.raw_user_meta_data->'vetting_metadata' is not null
        then new.raw_user_meta_data->'vetting_metadata'
        else '{}'::jsonb
      end
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists enquiries_updated_at on public.enquiries;
create trigger enquiries_updated_at
  before update on public.enquiries
  for each row execute procedure public.handle_updated_at();

drop trigger if exists jobs_updated_at on public.jobs;
create trigger jobs_updated_at
  before update on public.jobs
  for each row execute procedure public.handle_updated_at();

-- =========================================================
-- VERIFICATION PIN
-- =========================================================
create or replace function public.generate_pin_on_in_progress()
returns trigger as $$
begin
  if new.status = 'in_progress' and (old.status is distinct from 'in_progress') then
    new.verification_pin := lpad(floor(random() * 10000)::text, 4, '0');
    new.pin_verified := false;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger generate_pin_on_in_progress
  before update on public.jobs
  for each row execute procedure public.generate_pin_on_in_progress();

-- RPC: get_job_pin — returns PIN only if caller is the plumber for that job
create or replace function public.get_job_pin(p_job_id uuid)
returns text as $$
  select verification_pin
  from public.jobs
  where id = p_job_id
    and plumber_id = auth.uid();
$$ language sql security definer stable;

-- RPC: verify_job_pin — atomically verifies PIN if caller is the customer
create or replace function public.verify_job_pin(p_job_id uuid, p_pin text)
returns boolean as $$
declare
  v_match boolean;
begin
  select (verification_pin = p_pin) into v_match
  from public.jobs
  where id = p_job_id
    and customer_id = auth.uid()
    and status = 'in_progress';

  if v_match is null then
    return false;
  end if;

  if v_match then
    update public.jobs
    set pin_verified = true
    where id = p_job_id
      and customer_id = auth.uid();
  end if;

  return v_match;
end;
$$ language plpgsql security definer;

-- =========================================================
-- ENABLE REALTIME
-- =========================================================
alter publication supabase_realtime add table public.enquiries;
alter publication supabase_realtime add table public.jobs;

-- =========================================================
-- REVIEWS
-- =========================================================
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null unique,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  plumber_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  flagged boolean not null default false,
  created_at timestamptz default now() not null
);

alter table public.reviews enable row level security;

create policy "Customers can insert reviews for own completed jobs" on public.reviews
  for insert with check (
    auth.uid() = customer_id
    and exists (
      select 1 from public.jobs
      where jobs.id = job_id
        and jobs.customer_id = auth.uid()
        and jobs.status = 'completed'
    )
  );

create policy "Plumbers can view own reviews" on public.reviews
  for select using (auth.uid() = plumber_id);

-- Admin review policies
create policy "Admins can view all reviews" on public.reviews
  for select using (public.is_admin());

create policy "Admins can update all reviews" on public.reviews
  for update using (public.is_admin());

create policy "Admins can delete all reviews" on public.reviews
  for delete using (public.is_admin());

-- RPC: check if review exists (security definer, bypasses RLS for customers)
create or replace function public.review_exists_for_job(p_job_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.reviews where job_id = p_job_id
  );
$$ language sql security definer stable;

-- Trigger: recalculate plumber rating on review insert
create or replace function public.update_plumber_rating()
returns trigger as $$
begin
  update public.plumber_details
  set rating = (
    select coalesce(avg(rating), 0) from public.reviews where plumber_id = new.plumber_id
  )
  where user_id = new.plumber_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger update_plumber_rating_trigger
  after insert on public.reviews
  for each row execute procedure public.update_plumber_rating();

-- =========================================================
-- JOB MESSAGES (chat between customer and plumber)
-- =========================================================
create table public.job_messages (
  id uuid default uuid_generate_v4() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(content) > 0 and char_length(content) <= 2000),
  read_at timestamptz,
  created_at timestamptz default now() not null
);

create index idx_job_messages_job_created
  on public.job_messages(job_id, created_at asc);

create index idx_job_messages_unread
  on public.job_messages(job_id, sender_id)
  where read_at is null;

alter table public.job_messages enable row level security;

create policy "Job participants can view messages"
  on public.job_messages for select using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id
        and (j.customer_id = auth.uid() or j.plumber_id = auth.uid())
    )
  );

create policy "Job participants can send messages"
  on public.job_messages for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.jobs j
      where j.id = job_id
        and (j.customer_id = auth.uid() or j.plumber_id = auth.uid())
        and j.status in ('accepted', 'in_progress')
    )
  );

create policy "Job participants can mark messages read"
  on public.job_messages for update using (
    sender_id != auth.uid()
    and exists (
      select 1 from public.jobs j
      where j.id = job_id
        and (j.customer_id = auth.uid() or j.plumber_id = auth.uid())
    )
  ) with check (read_at is not null);

-- Auto-delete messages when both parties confirm job completion
create or replace function public.delete_messages_on_job_complete()
returns trigger as $$
begin
  if new.customer_confirmed = true and new.plumber_confirmed = true then
    delete from public.job_messages where job_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger job_messages_cleanup
  before update on public.jobs
  for each row execute procedure public.delete_messages_on_job_complete();

alter publication supabase_realtime add table public.job_messages;

-- =========================================================
-- STRIPE CONNECT + FINANCE TABLES
-- =========================================================
create table public.plumber_connect_accounts (
  party_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_account_id text not null unique,
  onboarding_status text not null default 'pending'
    check (onboarding_status in ('pending', 'active', 'restricted')),
  payouts_enabled boolean not null default false,
  charges_enabled boolean not null default false,
  requirements_due_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  type text not null check (type in ('deposit', 'final', 'refund')),
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null check (char_length(currency) = 3),
  status text not null check (
    status in (
      'deposit_checkout_created',
      'deposit_paid',
      'deposit_failed_or_expired',
      'transfer_pending',
      'transferred',
      'transfer_reversed',
      'refunded',
      'forfeited',
      'disputed',
      'finance_hold'
    )
  ),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  transfer_group text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_job_id_idx on public.payments(job_id);
create index payments_status_idx on public.payments(status);

create table public.payout_transfers (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  plumber_id uuid not null references public.profiles(id) on delete cascade,
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null check (char_length(currency) = 3),
  status text not null check (status in ('pending', 'scheduled', 'created', 'reversed', 'failed', 'cancelled')),
  stripe_transfer_id text unique,
  stripe_transfer_reversal_id text unique,
  source_charge_id text,
  platform_fee_minor integer not null default 0 check (platform_fee_minor >= 0),
  scheduled_transfer_at timestamptz,
  delay_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payout_transfers_job_id_idx on public.payout_transfers(job_id);
create index payout_transfers_plumber_id_idx on public.payout_transfers(plumber_id);
create index idx_payout_transfers_scheduled_due
  on public.payout_transfers(scheduled_transfer_at)
  where status = 'scheduled';

create table public.webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  object_id text,
  processed_at timestamptz not null default now(),
  result text not null check (result in ('processed', 'duplicate', 'ignored', 'error')),
  error_code text
);

create table public.audit_events (
  id uuid primary key default uuid_generate_v4(),
  actor_type text not null check (actor_type in ('customer', 'plumber', 'system')),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  job_id uuid references public.jobs(id) on delete cascade,
  payload_min jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_job_id_idx on public.audit_events(job_id);
create index audit_events_created_at_idx on public.audit_events(created_at);

create table public.plumber_fee_penalties (
  id uuid primary key default uuid_generate_v4(),
  plumber_id uuid not null references public.profiles(id) on delete cascade,
  source_job_id uuid not null references public.jobs(id) on delete cascade,
  multiplier integer not null default 2 check (multiplier >= 2),
  remaining_uses integer not null default 1 check (remaining_uses >= 0),
  status text not null default 'pending' check (status in ('pending', 'applied', 'cancelled')),
  applied_job_id uuid references public.jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_job_id)
);

create index plumber_fee_penalties_plumber_status_idx
  on public.plumber_fee_penalties(plumber_id, status, created_at);

-- Updated_at triggers for finance tables
drop trigger if exists plumber_connect_accounts_updated_at on public.plumber_connect_accounts;
create trigger plumber_connect_accounts_updated_at
  before update on public.plumber_connect_accounts
  for each row execute procedure public.handle_updated_at();

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at
  before update on public.payments
  for each row execute procedure public.handle_updated_at();

drop trigger if exists payout_transfers_updated_at on public.payout_transfers;
create trigger payout_transfers_updated_at
  before update on public.payout_transfers
  for each row execute procedure public.handle_updated_at();

drop trigger if exists plumber_fee_penalties_updated_at on public.plumber_fee_penalties;
create trigger plumber_fee_penalties_updated_at
  before update on public.plumber_fee_penalties
  for each row execute procedure public.handle_updated_at();

-- RLS for finance tables
alter table public.plumber_connect_accounts enable row level security;
alter table public.payments enable row level security;
alter table public.payout_transfers enable row level security;
alter table public.webhook_events enable row level security;
alter table public.audit_events enable row level security;
alter table public.plumber_fee_penalties enable row level security;

create policy "Plumbers can view own connect account" on public.plumber_connect_accounts
  for select using (auth.uid() = party_id);

create policy "Participants can view payments" on public.payments
  for select using (
    exists (
      select 1
      from public.jobs
      where jobs.id = payments.job_id
        and (jobs.customer_id = auth.uid() or jobs.plumber_id = auth.uid())
    )
  );

create policy "Participants can view payout transfers" on public.payout_transfers
  for select using (
    exists (
      select 1
      from public.jobs
      where jobs.id = payout_transfers.job_id
        and (jobs.customer_id = auth.uid() or jobs.plumber_id = auth.uid())
    )
  );

create policy "Participants can view audit events" on public.audit_events
  for select using (
    (actor_id = auth.uid())
    or (
      job_id is not null
      and exists (
        select 1
        from public.jobs
        where jobs.id = audit_events.job_id
          and (jobs.customer_id = auth.uid() or jobs.plumber_id = auth.uid())
      )
    )
  );

create policy "Plumbers can view own fee penalties" on public.plumber_fee_penalties
  for select using (plumber_id = auth.uid());

-- =========================================================
-- HELPERS
-- =========================================================
create or replace function public.derive_job_start_at(p_scheduled_date date, p_scheduled_time text)
returns timestamptz as $$
declare
  normalized text := lower(coalesce(trim(p_scheduled_time), ''));
  hour_part integer := 9;
  minute_part integer := 0;
  hhmm text[];
begin
  if p_scheduled_date is null then
    return null;
  end if;

  if normalized ~ '^\d{1,2}:\d{2}$' then
    hour_part := split_part(normalized, ':', 1)::integer;
    minute_part := split_part(normalized, ':', 2)::integer;
  elsif normalized like '%morning%' then
    hour_part := 8;
  elsif normalized like '%afternoon%' then
    hour_part := 12;
  elsif normalized like '%evening%' then
    hour_part := 17;
  else
    hhmm := regexp_match(normalized, '([0-1]?[0-9]|2[0-3]):([0-5][0-9])');
    if hhmm is not null then
      hour_part := hhmm[1]::integer;
      minute_part := hhmm[2]::integer;
    end if;
  end if;

  return make_timestamptz(
    extract(year from p_scheduled_date)::integer,
    extract(month from p_scheduled_date)::integer,
    extract(day from p_scheduled_date)::integer,
    least(greatest(hour_part, 0), 23),
    least(greatest(minute_part, 0), 59),
    0,
    'Europe/London'
  );
end;
$$ language plpgsql stable;

-- =========================================================
-- CANCELLATION POLICY RPC
-- - Customer:
--   > 48h  : full refund
--   <= 48h : deposit forfeited
-- - Plumber:
--   > 48h  : full refund
--   <= 48h : full refund + platform fee doubled on plumber's next completed job
-- =========================================================
create or replace function public.cancel_job_with_policy(p_job_id uuid, p_actor text)
returns jsonb as $$
declare
  caller_id uuid := auth.uid();
  actor text := lower(coalesce(trim(p_actor), ''));
  selected_job public.jobs%rowtype;
  job_start_at timestamptz;
  free_window boolean := true;
  deposit_row public.payments%rowtype;
  has_deposit boolean := false;
  deposit_action text := 'no_deposit_record';
  penalty_applied boolean := false;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  if actor not in ('customer', 'plumber') then
    raise exception 'Invalid actor. Use customer or plumber.';
  end if;

  select *
  into selected_job
  from public.jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'Job not found';
  end if;

  if selected_job.status in ('completed', 'cancelled') then
    raise exception 'Job is already closed';
  end if;

  if actor = 'customer' and selected_job.customer_id <> caller_id then
    raise exception 'Only the job customer can cancel as customer';
  end if;

  if actor = 'plumber' and selected_job.plumber_id <> caller_id then
    raise exception 'Only the assigned plumber can cancel as plumber';
  end if;

  job_start_at := public.derive_job_start_at(selected_job.scheduled_date, selected_job.scheduled_time);
  if job_start_at is not null then
    free_window := (job_start_at - now()) > interval '48 hours';
  end if;

  select *
  into deposit_row
  from public.payments
  where job_id = selected_job.id
    and type = 'deposit'
  order by created_at desc
  limit 1
  for update;
  has_deposit := found;

  if has_deposit then
    if deposit_row.status = 'refunded' then
      deposit_action := 'already_refunded';
    elsif actor = 'customer' and not free_window then
      update public.payments
      set status = 'forfeited',
          updated_at = now()
      where id = deposit_row.id;
      deposit_action := 'forfeited';
    else
      update public.payments
      set status = 'refunded',
          updated_at = now()
      where id = deposit_row.id;

      insert into public.payments (
        job_id,
        type,
        amount_minor,
        currency,
        status,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        stripe_charge_id,
        transfer_group
      )
      values (
        deposit_row.job_id,
        'refund',
        deposit_row.amount_minor,
        deposit_row.currency,
        'refunded',
        deposit_row.stripe_checkout_session_id,
        deposit_row.stripe_payment_intent_id,
        deposit_row.stripe_charge_id,
        deposit_row.transfer_group
      );
      deposit_action := 'refunded_full';
    end if;
  end if;

  if actor = 'plumber' and not free_window then
    insert into public.plumber_fee_penalties (
      plumber_id,
      source_job_id,
      multiplier,
      remaining_uses,
      status
    )
    values (
      selected_job.plumber_id,
      selected_job.id,
      2,
      1,
      'pending'
    )
    on conflict (source_job_id) do nothing;

    penalty_applied := true;
  end if;

  update public.jobs
  set status = 'cancelled',
      notes = case
        when actor = 'customer' and free_window then 'customer_cancelled_free_window'
        when actor = 'customer' and not free_window then 'customer_cancelled_deposit_forfeit'
        when actor = 'plumber' and free_window then 'plumber_cancelled_free_window'
        else 'plumber_cancelled_late_refund_plus_fee_penalty'
      end,
      customer_confirmed = false,
      plumber_confirmed = false
  where id = selected_job.id;

  if actor = 'customer' then
    update public.jobs
    set status = 'cancelled',
        notes = 'customer_cancelled',
        customer_confirmed = false,
        plumber_confirmed = false
    where enquiry_id = selected_job.enquiry_id
      and id <> selected_job.id
      and status in ('pending', 'quoted', 'declined', 'accepted', 'in_progress');

    update public.enquiries
    set status = 'cancelled'
    where id = selected_job.enquiry_id
      and status <> 'completed';
  elsif not exists (
    select 1
    from public.jobs
    where enquiry_id = selected_job.enquiry_id
      and id <> selected_job.id
      and status in ('accepted', 'in_progress')
  ) then
    update public.enquiries
    set status = case
      when exists (
        select 1
        from public.jobs
        where enquiry_id = selected_job.enquiry_id
          and status = 'quoted'
      ) then 'accepted'
      else 'new'
    end
    where id = selected_job.enquiry_id
      and status = 'in_progress';
  end if;

  insert into public.audit_events (actor_type, actor_id, action, job_id, payload_min)
  values (
    actor,
    caller_id,
    'job_cancelled',
    selected_job.id,
    jsonb_build_object(
      'free_window', free_window,
      'deposit_action', deposit_action,
      'penalty_applied', penalty_applied
    )
  );

  return jsonb_build_object(
    'job_id', selected_job.id,
    'actor', actor,
    'free_window', free_window,
    'deposit_action', deposit_action,
    'penalty_applied', penalty_applied
  );
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.cancel_job_with_policy(uuid, text) to authenticated;

-- =========================================================
-- INCREMENT JOBS COMPLETED + APPLY PENALTY
-- =========================================================
create or replace function public.increment_jobs_completed()
returns trigger as $$
declare
  penalty_id uuid;
  penalty_multiplier integer;
  penalty_remaining integer;
begin
  if new.status = 'completed' and old.status != 'completed' then
    update public.plumber_details
    set jobs_completed = jobs_completed + 1,
        provisional_jobs_remaining = greatest(provisional_jobs_remaining - 1, 0),
        status = case
          when status = 'provisional' and greatest(provisional_jobs_remaining - 1, 0) = 0 then 'active'
          else status
        end
    where user_id = new.plumber_id;

    select id, multiplier, remaining_uses
    into penalty_id, penalty_multiplier, penalty_remaining
    from public.plumber_fee_penalties
    where plumber_id = new.plumber_id
      and status = 'pending'
      and remaining_uses > 0
    order by created_at asc
    limit 1
    for update skip locked;

    if penalty_id is not null then
      update public.plumber_fee_penalties
      set remaining_uses = greatest(penalty_remaining - 1, 0),
          status = case when penalty_remaining - 1 <= 0 then 'applied' else status end,
          applied_job_id = new.id,
          updated_at = now()
      where id = penalty_id;

      update public.jobs
      set platform_fee_multiplier = greatest(platform_fee_multiplier, penalty_multiplier)
      where id = new.id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger increment_jobs_completed_trigger
  after update on public.jobs
  for each row execute procedure public.increment_jobs_completed();

-- =========================================================
-- FREEZE PLUMBER RPC (admin use)
-- =========================================================
create or replace function public.freeze_plumber(p_user_id uuid, p_reason text default null)
returns void as $$
begin
  -- Only allow service_role (admin) to freeze plumbers
  if current_setting('request.jwt.claim.role', true) != 'service_role' then
    raise exception 'Unauthorized: only admins can freeze plumber accounts';
  end if;

  update public.plumber_details
  set status = 'frozen',
      frozen_reason = p_reason
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;

-- =========================================================
-- STORAGE BUCKET FOR ENQUIRY IMAGES (safer re-run)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('enquiry-images', 'enquiry-images', true)
on conflict (id) do nothing;

create policy "Anyone can view enquiry images" on storage.objects
  for select using (bucket_id = 'enquiry-images');

create policy "Authenticated users can upload enquiry images" on storage.objects
  for insert with check (bucket_id = 'enquiry-images' and auth.role() = 'authenticated');

-- =========================================================
-- STORAGE BUCKET FOR VETTING DOCUMENTS (private)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('vetting-documents', 'vetting-documents', false)
on conflict (id) do nothing;

create policy "Authenticated users can upload vetting documents" on storage.objects
  for insert with check (bucket_id = 'vetting-documents' and auth.role() = 'authenticated');

create policy "Users can view own vetting documents" on storage.objects
  for select using (bucket_id = 'vetting-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own vetting documents" on storage.objects
  for update using (bucket_id = 'vetting-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own vetting documents" on storage.objects
  for delete using (bucket_id = 'vetting-documents' and (storage.foldername(name))[1] = auth.uid()::text);
