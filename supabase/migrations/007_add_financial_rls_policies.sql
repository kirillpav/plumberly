-- Migration 007: Add missing RLS policies for financial tables
-- These tables have RLS enabled but only SELECT policies defined.
-- Service-role operations (edge functions, triggers) need write access.

-- plumber_connect_accounts: service role needs full access for Stripe webhooks
create policy "Service role full access on plumber_connect_accounts"
  on public.plumber_connect_accounts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- payments: service role needs full access for checkout/webhook flows
create policy "Service role full access on payments"
  on public.payments
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- payout_transfers: service role needs full access for transfer scheduling
create policy "Service role full access on payout_transfers"
  on public.payout_transfers
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- webhook_events: service role needs full access for idempotency tracking
create policy "Service role full access on webhook_events"
  on public.webhook_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- audit_events: service role needs INSERT for triggers and edge functions
create policy "Service role full access on audit_events"
  on public.audit_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- plumber_fee_penalties: service role needs full access for penalty management
create policy "Service role full access on plumber_fee_penalties"
  on public.plumber_fee_penalties
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
