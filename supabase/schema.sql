-- Plumberly Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (auto-created on signup via trigger)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  phone text,
  avatar_url text,
  role text not null check (role in ('customer', 'plumber')),
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Plumbers can view customer profiles for their jobs" on public.profiles
  for select using (
    role = 'customer' and id in (
      select customer_id from public.jobs where plumber_id = auth.uid()
    )
  );

-- Plumber details
create table public.plumber_details (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  regions text[] default '{}',
  hourly_rate numeric(10,2) default 0,
  bio text,
  verified boolean default false,
  rating numeric(3,2) default 0,
  jobs_completed integer default 0
);

alter table public.plumber_details enable row level security;

create policy "Plumbers can view own details" on public.plumber_details
  for select using (auth.uid() = user_id);

create policy "Plumbers can update own details" on public.plumber_details
  for update using (auth.uid() = user_id);

create policy "Customers can view plumber details" on public.plumber_details
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'customer')
  );

-- Enquiries
create table public.enquiries (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  status text not null default 'new' check (status in ('new', 'accepted', 'in_progress', 'completed', 'cancelled')),
  preferred_date date,
  preferred_time text,
  images text[] default '{}',
  chatbot_transcript jsonb,
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

create policy "Plumbers can view all enquiries" on public.enquiries
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'plumber')
  );

-- Jobs
create table public.jobs (
  id uuid default uuid_generate_v4() primary key,
  enquiry_id uuid references public.enquiries(id) on delete cascade not null,
  customer_id uuid references public.profiles(id) not null,
  plumber_id uuid references public.profiles(id) not null,
  status text not null default 'pending' check (status in ('pending', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled')),
  quote_amount numeric(10,2),
  scheduled_date date,
  notes text,
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

-- Auto-create profile on signup
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
    insert into public.plumber_details (user_id, regions, hourly_rate)
    values (
      new.id,
      coalesce(
        array(select jsonb_array_elements_text(new.raw_user_meta_data->'regions')),
        '{}'
      ),
      coalesce((new.raw_user_meta_data->>'hourly_rate')::numeric, 0)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger enquiries_updated_at
  before update on public.enquiries
  for each row execute procedure public.handle_updated_at();

create trigger jobs_updated_at
  before update on public.jobs
  for each row execute procedure public.handle_updated_at();

-- Storage bucket for enquiry images
insert into storage.buckets (id, name, public)
values ('enquiry-images', 'enquiry-images', true);

create policy "Anyone can view enquiry images" on storage.objects
  for select using (bucket_id = 'enquiry-images');

create policy "Authenticated users can upload enquiry images" on storage.objects
  for insert with check (bucket_id = 'enquiry-images' and auth.role() = 'authenticated');
