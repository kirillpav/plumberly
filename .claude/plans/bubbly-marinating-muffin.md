# Stripe Checkout Payment Flow for Quote Acceptance

## Context

Currently, when a customer taps "Accept" on a quote, the job immediately jumps to `in_progress` without collecting payment. The Stripe Checkout backend (`stripe-create-checkout` edge function) already exists but isn't wired into the UI. We need to integrate it so the customer pays a £50 deposit via Stripe Checkout in the system browser before the job progresses. Payment confirmation comes exclusively via webhook — the deep link return is cosmetic only.

## Status Progression (updated)

```
pending → quoted → accepted (checkout created) → deposit_paid (webhook confirmed) → in_progress → completed
```

New status: `deposit_paid` — set only by webhook after `checkout.session.completed`.

## Changes

### 1. Add `deposit_paid` to JobStatus type
**File:** `src/types/index.ts:66`
- Add `'deposit_paid'` to the `JobStatus` union type

### 2. Fix deep link URLs in `stripe-create-checkout`
**File:** `supabase/functions/stripe-create-checkout/index.ts:97-98`
- Change `plumberly://payment-success` → `fluxservice://payment?status=success`
- Change `plumberly://payment-cancel` → `fluxservice://payment?status=cancel`
- (App scheme is `fluxservice`, not `plumberly`)

### 3. Add `checkout.session.completed` webhook handler
**File:** `supabase/functions/stripe-webhook/index.ts`
- Add new handler function `handleCheckoutSessionCompleted(event)`
- Extract `job_id` from session metadata
- Idempotency: check `webhook_events` table, skip if already processed
- Update `payments` row: set `status = 'deposit_paid'`, store `stripe_payment_intent_id` from session
- Update job status: `accepted` → `deposit_paid`
- Update enquiry status: → `in_progress`
- Cancel competing jobs (other pending/quoted/declined/accepted jobs for same enquiry) with `notes = 'not_selected'`
- Send push notification to chosen plumber: "Deposit Paid — Job Confirmed"
- Send push notification to non-selected plumbers: "Another plumber was selected"
- Add `"checkout.session.completed"` case to the switch statement

### 4. Rewrite `acceptQuote` in jobStore
**File:** `src/store/jobStore.ts:160-225`
- Remove all direct status updates, competing-job cancellation, and notification logic (webhook handles this now)
- Instead: call `stripe-create-checkout` edge function with `job_id`
- Get back `checkout_url`
- Open URL in system browser via `Linking.openURL(checkout_url)` (not WebBrowser — we don't trust the return)
- Return the checkout URL (caller may need it)
- The edge function already sets job status to `accepted`

### 5. Update `handleAcceptQuote` in EnquiryDetailScreen
**File:** `src/screens/customer/EnquiryDetailScreen.tsx:146-160`
- Remove the success alert ("Job Started") — payment hasn't been confirmed yet
- After `acceptQuote()` returns, show a brief info alert: "Opening payment..." or similar
- The real-time subscription will pick up the status change when webhook fires

### 6. Update job filtering in EnquiryDetailScreen
**File:** `src/screens/customer/EnquiryDetailScreen.tsx:139-144`
- Include `accepted` and `deposit_paid` in the `activeJob` derivation:
  ```ts
  const activeJob = allJobs.find(
    (j) => ["accepted", "deposit_paid", "in_progress", "completed"].includes(j.status)
  );
  ```
- Show appropriate status messaging for `accepted` (awaiting payment confirmation) and `deposit_paid` (payment confirmed, awaiting work)

### 7. Update UI for `accepted` and `deposit_paid` status states
**File:** `src/screens/customer/EnquiryDetailScreen.tsx` (assigned plumber section)
- `accepted` status: show "Payment Processing" badge — customer has been sent to checkout, awaiting confirmation
- `deposit_paid` status: show "Deposit Paid" badge with green styling — confirmed, plumber notified
- Both should show the assigned plumber details (name, quote, schedule)

### 8. Update plumber JobDetailScreen for new statuses
**File:** `src/screens/plumber/JobDetailScreen.tsx`
- Handle `accepted` status: show "Customer is completing payment" message
- Handle `deposit_paid` status: show "Deposit confirmed — ready to start" with relevant job details

## Files Modified

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `deposit_paid` to JobStatus |
| `supabase/functions/stripe-create-checkout/index.ts` | Fix deep link URLs |
| `supabase/functions/stripe-webhook/index.ts` | Add `checkout.session.completed` handler |
| `src/store/jobStore.ts` | Rewrite `acceptQuote` to call edge function + open browser |
| `src/screens/customer/EnquiryDetailScreen.tsx` | Update accept flow, job filtering, status UI |
| `src/screens/plumber/JobDetailScreen.tsx` | Handle `accepted` and `deposit_paid` statuses |

## Verification

1. Tap "Accept" on a quoted job → Stripe Checkout opens in system browser
2. Complete payment → return to app via deep link (cosmetic)
3. Webhook fires → job status becomes `deposit_paid`, competing quotes cancelled
4. Customer sees "Deposit Paid" badge on their enquiry
5. Plumber sees "Deposit confirmed" on their job detail
6. Non-selected plumbers get notified and their jobs show cancelled
