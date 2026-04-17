-- Migration 008: Add missing indexes on frequently-queried columns

-- profiles: filtered by role in plumber discovery queries
create index if not exists idx_profiles_role on public.profiles(role);

-- enquiries: filtered by customer_id + status in customer enquiry lists
create index if not exists idx_enquiries_customer_status on public.enquiries(customer_id, status);

-- jobs: filtered by plumber_id + status in plumber job lists
create index if not exists idx_jobs_plumber_status on public.jobs(plumber_id, status);

-- jobs: filtered by customer_id in customer job lookups
create index if not exists idx_jobs_customer on public.jobs(customer_id);

-- reviews: filtered by plumber_id for plumber profile/rating queries
create index if not exists idx_reviews_plumber on public.reviews(plumber_id);
