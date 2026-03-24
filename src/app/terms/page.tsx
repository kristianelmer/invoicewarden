import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-gray-600 underline">
        ← Back to home
      </Link>

      <h1 className="mt-4 text-3xl font-semibold">InvoiceWarden Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-600">Effective date: 2026-03-24</p>

      <div className="mt-8 space-y-6 text-sm leading-6 text-gray-800">
        <section>
          <h2 className="text-base font-semibold">1. Scope of Service</h2>
          <p>
            InvoiceWarden provides software tools for invoice tracking, statutory-fee
            calculations, reminder automation, enforcement-notice drafting, payment collection
            workflows, and audit logging. InvoiceWarden is a software provider and not a law firm,
            debt collector, or legal representative.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">2. Legal Information Disclaimer</h2>
          <p>
            Jurisdiction logic and statutory references are provided for workflow automation and
            informational purposes only. They are not legal advice. You are solely responsible for
            confirming legal applicability and obtaining legal counsel where needed.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">3. Success Fee (20% of Recovered Late Fees)</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>No upfront enforcement fee unless explicitly stated in your plan.</li>
            <li>
              InvoiceWarden charges a <strong>20% Success Fee</strong> only on statutory interest,
              late fees, and legal add-ons actually recovered through the platform.
            </li>
            <li>No Success Fee is charged on the original invoice principal amount.</li>
            <li>
              Success Fee is earned only when funds are successfully received and settled.
            </li>
            <li>
              InvoiceWarden may deduct Success Fees, payment processing fees, and applicable taxes
              before payout.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">4. Stripe Connect and Payment Flows</h2>
          <p>
            By enabling collections, you authorize InvoiceWarden to initiate payment workflows via
            Stripe (including Stripe Connect and PaymentIntents), route funds to your connected
            account, and apply platform fees as configured. You are responsible for maintaining a
            valid and compliant Stripe account.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">5. Enforcement Messaging and Communications</h2>
          <p>
            You authorize InvoiceWarden to send reminder and compliance notices to invoice contacts
            using sender identities such as legal-bot@invoicewarden.com or
            compliance@invoicewarden.com. You are responsible for the underlying invoice validity,
            recipient accuracy, and authorization to contact recipients.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">6. Acceptable Use</h2>
          <p>You agree not to use InvoiceWarden to:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Submit fraudulent, fabricated, or disputed invoices in bad faith.</li>
            <li>Harass, threaten, or unlawfully pressure recipients.</li>
            <li>Misrepresent legal rights, court actions, or government endorsements.</li>
            <li>Violate anti-spam, consumer protection, labor, privacy, or contract law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">7. User Responsibilities</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Keep account credentials secure.</li>
            <li>Provide accurate invoice, contract, and customer data.</li>
            <li>Review generated notices before use where required by your jurisdiction.</li>
            <li>Maintain lawful basis for processing personal data.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">8. Audit Trail and Records</h2>
          <p>
            InvoiceWarden may store message logs, delivery events, and related metadata to support
            auditability and evidence trails. Availability of read receipts depends on recipient
            mail systems and is not guaranteed.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">9. Refunds, Chargebacks, and Reversals</h2>
          <p>
            If collected funds are reversed, refunded, charged back, or deemed unauthorized,
            InvoiceWarden may reverse, offset, or claw back related Success Fees and payouts.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">10. Suspension and Termination</h2>
          <p>
            InvoiceWarden may suspend or terminate access for legal risk, non-payment, fraud,
            repeated disputes, or policy violations. You may terminate at any time, subject to
            settlement of outstanding balances and fees.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">11. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, InvoiceWarden is not liable for indirect,
            incidental, special, consequential, or punitive damages, or for lost profits, revenue,
            or goodwill. Total liability is limited to amounts paid by you to InvoiceWarden during
            the 12 months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">12. No Warranty</h2>
          <p>
            Services are provided &quot;as is&quot; and &quot;as available&quot; without warranties of uninterrupted
            service, legal enforceability outcomes, or guaranteed payment recovery.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">13. Changes to Terms</h2>
          <p>
            We may update these Terms periodically. Material updates will be posted with a revised
            effective date. Continued use after updates constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">14. Governing Law</h2>
          <p>
            Unless otherwise required by mandatory law, these Terms are governed by the laws of the
            jurisdiction specified in your account agreement. Venue and dispute resolution terms may
            be supplemented in enterprise/order-form agreements.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">15. Contact</h2>
          <p>
            Legal and support inquiries: <a className="underline" href="mailto:legal@invoicewarden.com">legal@invoicewarden.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}
