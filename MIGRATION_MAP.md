# InvoiceWarden Migration Map

## Structure
- `old_project/` = archived reference implementation
- `new_project/` = active rebuild

## Porting Principle
Port feature-by-feature, not file-by-file.
Each imported block must satisfy a current slice acceptance criterion.

## Initial Slice Plan (MLP)
1. Auth + dashboard shell (minimal)
2. Customers (create/list)
3. Invoices (create/list)
4. Reminder scheduling + run-due sender
5. Mark-paid + basic recovered metrics

## Candidate logic sources in old_project
- `old_project/src/lib/reminders.ts`
- `old_project/src/lib/email.ts`
- `old_project/src/lib/validators.ts`
- `old_project/src/app/api/invoices/*`
- `old_project/src/app/api/reminders/*`

## Defer for now
- `old_project/src/app/api/enforcement/*`
- `old_project/src/app/api/stripe/connect/*`
- non-MLP dashboard extras
