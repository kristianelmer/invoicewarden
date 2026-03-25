# InvoiceWarden Product Spec (MLP-first)

Last updated: 2026-03-25

## Core Promise
InvoiceWarden helps businesses recover unpaid invoices by calculating and claiming law-mandated late-payment interest and fees.

## Jurisdiction Strategy
- v1: United Kingdom only (active)
- v1.1: New York (planned)
- v1.2: California (planned)

Reason: legal correctness is the product; single-jurisdiction launch minimizes legal and testing risk.

## MLP Scope (Slice 1)
1. Customer + invoice creation
2. UK interest/fee calculation
3. Claim-ready reminder generation
4. Send + retry + idempotency basics
5. Ledger view (principal, interest, fees, paid, outstanding)

## v1 Commercial Requirements (Must-have before release)
1. Reminder emails include a professional invoice PDF attachment.
2. User connects Stripe account to receive payments.
3. Recipient can pay invoice claim through Stripe payment flow.
4. Platform fee redirects 20% of additional legal recovery (`interest + legal_fees`) to Kristian.
5. Payout and fee split are visible in audit/reporting views.

## Deferred (Post-v1)
- California and New York legal engines
- Deep analytics and visual polish
