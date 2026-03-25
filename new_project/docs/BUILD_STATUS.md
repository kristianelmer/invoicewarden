# Build Status

Last updated: 2026-03-25

## Completed
- IW-2001: New project Next.js shell created with core routes and navigation.
- IW-2002 (baseline): Supabase auth path added (login page, dashboard route protection, signout endpoint, middleware session refresh).
- IW-3001: Customers API now persisted via Supabase (`customers` table contract) with validation + duplicate email conflict handling.
- IW-3002: Invoices API now persisted via Supabase (`invoices` table contract) with validation + duplicate invoice number conflict handling.
- IW-3003 (partial): Customers/Invoices UI forms and list views wired to APIs.
- IW-1003 (partial): Initial migration file created for `customers` and `invoices` with RLS and ownership policies.

## Verification
- `npm run build` ✅

## Pending / Next
1. Apply migration in Supabase environment and verify with real auth sessions.
2. Add integration tests for APIs + auth edge cases.
3. Start IW-1001 / IW-1002 legal rules spec + test matrix, then IW-4001 UK engine.
4. Implement IW-9001 professional PDF generation for reminder attachments.
5. Implement IW-9002/9003/9004 Stripe connect/payment + 20% additional-recovery split.

## Risks / Notes
- Migration has not yet been applied to remote DB in this session.
- Current middleware checks for Supabase auth cookie presence before route access; route handlers also enforce user auth.
- Stripe/payment and PDF work still pending in this autonomous run.
