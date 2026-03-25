# Payment + 20% Split Implementation Plan (Next Milestone)

Last updated: 2026-03-25

## Goal
Implement Stripe payment flow where:
- customer pays total claim via Stripe
- seller receives principal + 80% of additional recovery
- platform receives 20% of additional recovery only

## Formula (v1)
- `additional_recovery = interest + legal_fees`
- `platform_fee = round(additional_recovery * 0.20)`
- `total_claim = principal + additional_recovery`

## Route to build next
- `POST /api/invoices/[id]/payment-session`

## Route behavior
1. Auth user
2. Load invoice + customer
3. Verify invoice not paid
4. Verify Stripe Connect account exists + onboarded
5. Calculate claim using UK engine
6. Compute platform fee from additional recovery only
7. Create Stripe Checkout Session:
   - line item amount = total claim
   - `payment_intent_data.application_fee_amount = platform_fee`
   - `payment_intent_data.transfer_data.destination = stripe_connect_account_id`
8. Persist generated checkout URL
9. Persist event log row with financial breakdown

## Required DB fields (minimum)
- `profiles.stripe_connect_account_id`
- `profiles.stripe_connect_onboarded`
- `invoices.payment_url` (optional but helpful)
- event log table for payment_session_created / payment_succeeded

## Reuse candidates from old_project
- `old_project/src/app/api/enforcement/checkout-link/route.ts`
- `old_project/src/app/api/enforcement/payment-intent/route.ts`

## Acceptance criteria for milestone commit
- payment-session route exists and returns session URL
- fee formula excludes principal
- Stripe metadata includes `additional_recovery` + `platform_fee`
- build passes
