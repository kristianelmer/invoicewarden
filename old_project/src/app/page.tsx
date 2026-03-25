import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="mb-14 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">InvoiceWarden</p>
          <h1 className="text-2xl font-semibold">Statutory late-fee enforcement for freelancers</h1>
        </div>
        <div className="flex gap-2">
          {user ? (
            <Link href="/dashboard" className="rounded border px-4 py-2 text-sm">
              Open dashboard
            </Link>
          ) : (
            <Link href="/login" className="rounded border px-4 py-2 text-sm">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <section className="grid gap-8 rounded-2xl border p-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-red-700">Built for overdue invoices</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Stop chasing invoices manually. Let the law do the heavy lifting.
          </h2>
          <p className="mt-3 text-gray-700">
            InvoiceWarden automatically calculates statutory fees and transitions from reminders
            to enforcement notices as deadlines pass.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={user ? "/dashboard" : "/login"} className="rounded bg-black px-4 py-2 text-sm text-white">
              {user ? "Go to dashboard" : "Start free"}
            </Link>
            <Link href="/terms" className="rounded border px-4 py-2 text-sm">
              Read terms
            </Link>
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <h3 className="text-base font-semibold">How it works</h3>
          <ol className="mt-3 space-y-2 text-sm text-gray-700">
            <li>1. Add invoice amount, due date, and jurisdiction (UK / NY / CA).</li>
            <li>2. See live legal exposure in the Pain Meter.</li>
            <li>3. Auto-send reminders and compliance notices from legal-bot identity.</li>
            <li>4. Collect updated totals (principal + legal add-ons) through Stripe.</li>
          </ol>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold">UK</h3>
          <p className="mt-2 text-sm text-gray-700">
            8% + BoE base rate interest, daily accrual, and fixed debt recovery fees.
          </p>
        </article>
        <article className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold">New York</h3>
          <p className="mt-2 text-sm text-gray-700">
            Freelance Isn&apos;t Free Act exposure tracking with double-damages warning mode.
          </p>
        </article>
        <article className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold">California</h3>
          <p className="mt-2 text-sm text-gray-700">
            SB 988 automation with statutory damages and optional contract-refusal penalties.
          </p>
        </article>
      </section>

      <section className="mt-8 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Success fee model</h2>
        <p className="mt-2 text-sm text-gray-700">
          No upfront enforcement fee. InvoiceWarden charges a <strong>20% success fee</strong>
          only on legal late fees/interest actually recovered through the platform.
          No success fee is charged on invoice principal.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          See full contractual terms at <Link href="/terms" className="underline">/terms</Link>.
        </p>
      </section>
    </main>
  );
}
