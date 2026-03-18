# FluxService Plumber Vetting Form Spec

Status:
- Updated to match the current website implementation
- Accurate as of March 8, 2026
- Source of truth is the website form in `FluxServiceWebsite`, not the older app registration flow

Primary implementation files:
- [plumber-auth-form.tsx](/Users/sid/Documents/New%20project/FluxServiceWebsite/components/auth/plumber-auth-form.tsx)
- [auth-provider.tsx](/Users/sid/Documents/New%20project/FluxServiceWebsite/components/auth/auth-provider.tsx)
- [app/plumber/register/page.tsx](/Users/sid/Documents/New%20project/FluxServiceWebsite/app/plumber/register/page.tsx)

Related recent site commit:
- `ea8baf3` `Simplify portals and refine registration flow`

## 1. Purpose

This document describes the current website plumber registration and vetting flow:
- what the applicant sees
- what is required
- what branches by business type
- what is stored in signup metadata
- what is intentionally not collected anymore
- what is still caveated or incomplete

This is a dev-facing implementation spec, not legal advice.

## 2. High-Level Flow

Route:
- `/plumber/register`

Current flow:
- applicant chooses `Sole Trader` or `Limited Company`
- applicant completes shared auth/contact fields
- applicant completes branch-specific business/vetting fields
- applicant completes shared trade/compliance/insurance fields
- applicant accepts the required legal/approval acknowledgements
- form submits through `signUp(...)`
- signup redirects new plumbers to awaiting approval

Important product behavior:
- full plumber workspace access is not immediate
- registration is reviewed before normal plumber workspace access is enabled
- Stripe Connect payout/identity steps happen later through Stripe-hosted onboarding, not inside this form

## 3. Major Current Decisions

These are important because older notes may still conflict with them.

Current form does:
- collect structured vetting data
- branch into sole trader vs limited company
- integrate with Companies House lookup for limited companies
- collect insurance and gas/compliance information
- collect service coverage settings
- require explicit independent-contractor acknowledgement

Current form does not do:
- photo ID upload
- date of birth collection
- explicit right-to-work document collection
- real document upload storage
- real inbox/email ownership verification
- direct Stripe onboarding during registration

## 4. Legal/Product Wording Currently In The Form

The current form now uses wording along these lines:

Intro:
- “Apply as a plumber”
- “Create your FluxService plumber account. We use this form to review your business details, service coverage, insurance, and payout readiness.”

Summary card:
- FluxService is a platform that connects customers with independent plumbers
- registration does not create an employment relationship
- registration is reviewed before approval
- additional identity/payout/bank verification may happen later through Stripe Connect
- the form asks only for information needed for application review, profile management, payouts, and compliance

Required acknowledgements:
- applicant confirms the information is accurate
- applicant confirms they are legally entitled to provide plumbing services in the UK
- applicant confirms they are using FluxService as an independent service provider, not as an employee/worker/agent of FluxService
- applicant accepts Terms and Privacy Policy

## 5. Shared Fields For All Applicants

### 5.1 Core Auth / Contact

Required:
- business type
- email
- password
- confirm password
- phone

Validation:
- business type required
- email required and must be valid format
- user must click `Verify email`
- password required
- confirm password required and must match
- phone required and must pass phone validation

Important implementation note:
- `Verify email` is still only a format check in the current implementation
- it is not OTP/magic-link/inbox verification

### 5.2 Shared Trade / Service Setup

Fields:
- bio
- service regions
- services type

Required:
- at least one region
- services type selection is functionally required for downstream gas logic

Options:
- service regions come from shared `REGIONS`
- services type is `gas` or `no_gas`

### 5.3 Shared Technical / Compliance Questions

Required:
- unvented cylinders yes/no
- public liability insurance yes/no
- legal entitlement / accuracy checkbox
- independent contractor checkbox
- Terms / Privacy acceptance checkbox

If `unvented cylinders = yes`:
- unvented certificate file required

If `public liability insurance = yes`:
- insurer name required
- policy number required
- expiry date required
- cover amount required
- insurance proof file required

If `public liability insurance = no`:
- application can still proceed

## 6. Sole Trader Branch

Shown when:
- `businessType === 'sole_trader'`

### 6.1 Required Sole Trader Fields

Identity / trading:
- first name
- last name
- trading name
- home address line 1
- home city
- home postcode
- proof of address file
- base postcode
- years trading
- invoice proof file

Optional:
- home address line 2

Years trading options:
- `<6m`
- `6-24m`
- `2-5y`
- `5+y`

Invoice proof hint behavior:
- `<6m` shows “upload your most recent invoice”
- other values show “upload an invoice over 6 months old”

### 6.2 Sole Trader Gas Logic

If services type is `gas`:
- Gas Safe number required

If services type is `no_gas`:
- no gas-specific sole trader field required

### 6.3 Sole Trader Explicit Non-Requirements

No longer collected:
- DOB
- photo ID

Still collected:
- home address
- proof of address filename
- trading/base postcode
- invoice proof filename

## 7. Limited Company Branch

Shown when:
- `businessType === 'limited_company'`

### 7.1 Company Identity / Verification Fields

Required:
- company name
- company number
- company status
- incorporation date
- your role
- officer confirmation
- trading postcode
- service radius in miles

Optional:
- VAT number
- company website
- trading address line 1
- trading address line 2
- trading city

### 7.2 Companies House Lookup

Still present and still important.

Integration:
- Supabase Edge Function `companies-house-lookup`

Behavior:
- applicant enters company number
- company number is format-validated first
- `Verify company` calls the lookup function
- if successful, company fields are populated from Companies House
- some fields become read-only when verified

Autofill-supported fields:
- registered office address
- company status
- incorporation date
- SIC codes
- director list

Business rule:
- company must be `active` to continue

Accepted company number formats:
- 8 digits
- 2 letters followed by 6 digits

### 7.3 Officer / Authority Branching

If applicant says they are an officer:
- officer first name required
- officer last name required

If applicant says they are not an officer:
- director contact email required
- director contact phone required
- letter of authority file is optional in the current form

Important:
- officer DOB is no longer collected
- this form still does not implement a true director-verification workflow

### 7.4 New Company Additional Evidence

If incorporation date is less than 6 months old:
- applicant must say whether they traded previously as a sole trader or different company

If previous trading background is `yes`:
- previous company number can be provided
- previous trading proof file is required if no previous company number is provided

If previous trading background is `no`:
- no extra evidence beyond that answer

### 7.5 Limited Company Gas Logic

If services type is `gas`:
- applicant must choose whether Gas Safe registration is held by `company` or `engineer`

If holder is `company`:
- company Gas Safe number required

If holder is `engineer`:
- engineer Gas Safe number required
- engineer Gas Safe cards file required

If services type is `no_gas`:
- no gas-specific company field required

## 8. Current Validation Summary

The form is submittable only when all of the following are true:
- shared auth fields are complete
- email has been manually format-verified in the UI
- phone is valid
- at least one region is selected
- unvented question is answered
- any required unvented evidence is present
- public liability insurance question is answered
- any required insurance evidence is present
- legal entitlement / accuracy checkbox is checked
- independent contractor checkbox is checked
- Terms / Privacy checkbox is checked
- all selected business-type-specific requirements are satisfied

Additional checks:
- company website, if present, must be valid HTTP/HTTPS URL
- company number must match accepted format
- company status must be `active`
- service radius must be greater than 0
- director contact email and phone are validated when applicant is not an officer

## 9. Signup Payload Sent To Supabase

Submission path:
- form calls `signUp(...)`
- `auth-provider.tsx` passes data into `supabase.auth.signUp({ options: { data: ... } })`

Top-level metadata currently includes:
- `full_name`
- `role`
- `phone`
- `regions`
- `bio`
- `business_name`
- `services_type`
- `gas_safe_number`
- `consent_to_checks`

Important:
- the old website auth layer no longer carries a separate `right_to_work` field in active use
- legal-entitlement language now lives in the required confirmation checkbox instead

## 10. Vetting Metadata Object

Current `vettingData` keys:

```json
{
  "business_type": "sole_trader | limited_company",
  "email_verified_check": true,

  "sole_trader": true,
  "first_name": "string | null",
  "last_name": "string | null",
  "trading_name": "string | null",
  "home_address_line_1": "string | null",
  "home_address_line_2": "string | null",
  "home_city": "string | null",
  "home_postcode": "string | null",
  "proof_of_address_filename": "string | null",
  "base_postcode": "string | null",
  "years_trading": "<6m | 6-24m | 2-5y | 5+y | null",
  "invoice_proof_filename": "string | null",

  "limited_company": true,
  "company_name": "string | null",
  "company_number": "string | null",
  "vat_number": "string | null",
  "company_website": "string | null",
  "company_registered_office_address": "string | null",
  "company_status": "active | dissolved | other | null",
  "company_incorporation_date": "YYYY-MM-DD | null",
  "company_sic_codes": "string | null",
  "company_directors": "string | null",
  "signup_role": "director | employee | subcontractor | admin | null",
  "officer_confirmation": "yes | no | null",
  "director_contact_email": "string | null",
  "director_contact_phone": "string | null",
  "letter_of_authority_filename": "string | null",
  "officer_first_name": "string | null",
  "officer_last_name": "string | null",
  "trading_postcode": "string | null",
  "service_radius_miles": "string | null",
  "trading_address_line_1": "string | null",
  "trading_address_line_2": "string | null",
  "trading_address_city": "string | null",
  "previous_trading_background": "yes | no | null",
  "previous_company_number": "string | null",
  "previous_trading_proof_filename": "string | null",

  "does_unvented_cylinders": true,
  "unvented_certificate_filename": "string | null",
  "gas_registration_holder": "company | engineer | null",
  "company_gas_safe_number": "string | null",
  "engineer_gas_safe_number": "string | null",
  "engineer_gas_safe_cards_filename": "string | null",

  "has_public_liability_insurance": true,
  "insurer_name": "string | null",
  "policy_number": "string | null",
  "policy_expiry_date": "YYYY-MM-DD | null",
  "cover_amount": "string | null",
  "insurance_proof_filename": "string | null",

  "independent_contractor_confirmed": true,
  "terms_privacy_confirmed": true
}
```

Notably absent now:
- `date_of_birth`
- `officer_dob`
- photo ID fields

## 11. Important Current Caveats

### 11.1 File Uploads Are Still Metadata-Only

Current behavior:
- the UI includes multiple file inputs
- the submit path stores `file.name` only
- actual file binaries are not uploaded by this form

Implication:
- if ops or backend expects real documents in storage, this is still incomplete

### 11.2 Email Verification Is Still Not Real Inbox Verification

Current behavior:
- `Verify email` checks format only
- there is no OTP, magic link, inbox verification, or mailbox ownership proof here

Implication:
- `email_verified_check` must not be treated as real identity assurance

### 11.3 Companies House Lookup Is Still Real And Still Required For That Branch

Current behavior:
- limited company flow still depends on `companies-house-lookup`
- the company section is still intact

Implication:
- removing DOB did not remove the Companies House path

### 11.4 Right-To-Work Is Not A Separate Collected Field

Current behavior:
- the form does not collect right-to-work documents
- the form does not collect DOB for right-to-work purposes
- instead it requires an applicant attestation that they are legally entitled to provide plumbing services in the UK

Implication:
- this is an attestation-based approach, not a Home Office verification workflow

### 11.5 Independent Contractor Position Is Now Explicit In-Form

Current behavior:
- the form now explicitly states that FluxService is a platform
- it explicitly states registration does not create an employment relationship
- it requires a checkbox acknowledging independent service provider status

Implication:
- this wording is now part of the current registration contract surface, not just an internal policy preference

## 12. Recommended Dev Follow-Ups

If this is going to become a full production vetting pipeline, likely next work items are:
- implement actual document uploads to storage
- store file paths or signed references instead of only filenames
- decide whether right-to-work stays attestation-only or becomes a real verification step
- implement real inbox/email verification if needed
- define the long-term storage model for vetting data outside auth metadata if needed
- build the actual admin review / approval workflow if that is still partially manual
- define whether non-officer authority verification becomes a real signed/director-confirmed flow

## 13. Short Version

The current website plumber vetting form is:
- more advanced than the app registration flow
- split into sole trader and limited company branches
- still integrated with Companies House lookup
- still collecting business, coverage, gas, and insurance information
- no longer collecting DOB
- no longer requiring photo ID
- now explicitly using independent-contractor / platform wording
- still not performing real document uploads
- still storing vetting payloads through Supabase Auth signup metadata
