# Build Status

Last updated: 2026-03-25

## Completed
- IW-2001: New project Next.js shell created with core routes and navigation.
- IW-2002 (baseline): Supabase auth path added (login page, dashboard route protection, signout endpoint, middleware session refresh).
- IW-3001: Customers API now persisted via Supabase (`customers` table contract) with validation + duplicate email conflict handling.
- IW-3002: Invoices API now persisted via Supabase (`invoices` table contract) with validation + duplicate invoice number conflict handling.
- IW-3003 (partial): Customers/Invoices UI forms and list views wired to APIs.
- IW-1003 (partial): Initial migration file created for `customers` and `invoices` with RLS and ownership policies.
- IW-1001 (baseline): UK legal rules calculation contract documented in `docs/LEGAL_RULES_UK.md`.
- IW-1002 (baseline): Executable UK engine tests added (`tests/uk-interest-engine.test.ts`, vitest configured).
- IW-4001 (baseline): UK interest engine scaffold implemented (`src/core/interest-engine/uk.ts`).

## Verification
- `npm test` ✅
- `npm run build` ✅

## Git Checkpoints
- `05f2441` chore: split repo into old_project archive and new_project rebuild workspace
- `727b657` feat: scaffold new_project app shell with auth and Supabase-backed customers/invoices

## Pending / Next
1. Apply migration in Supabase environment and verify with real auth sessions.
2. Expand UK legal matrix with edge cases + legal wording compliance notes.
3. Implement IW-9001 professional PDF generation for reminder attachments.
4. Implement IW-9002/9003/9004 Stripe connect/payment + 20% additional-recovery split.
5. Add integration tests for APIs + auth edge cases.

## Risks / Notes
- Migration has not yet been applied to remote DB in this session.
- Current middleware checks for Supabase auth cookie presence before route access; route handlers also enforce user auth.
- Stripe/payment and PDF work still pending in this autonomous run.
