# Environment Variables Checklist (from Kristian)

Last updated: 2026-03-25

Configured/provided variable names:

- BILLING_REPLY_TO
- LOW_DELIVERABILITY_MODE
- ENFORCEMENT_FROM
- CRON_SECRET
- EMAIL_FROM
- RESEND_API_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_ID
- NEXT_PUBLIC_APP_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY

## Notes

- Confirmed by Kristian: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set.
- Variables should be present in the environments we deploy from (Production at minimum; Preview/Development as needed).
