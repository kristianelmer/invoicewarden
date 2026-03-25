import { describe, expect, it } from 'vitest';
import { generateProfessionalInvoicePdf } from '../src/lib/pdf/invoice-pdf';

describe('professional invoice PDF generation', () => {
  it('produces a valid non-empty PDF byte stream', async () => {
    const bytes = await generateProfessionalInvoicePdf({
      invoiceNumber: 'INV-1001',
      issueDate: '2026-03-25',
      dueDate: '2026-04-01',
      currency: 'GBP',
      sellerName: 'Example Ltd',
      buyerName: 'Acme Ltd',
      buyerEmail: 'billing@acme.com',
      principal: 1200,
      interest: 12.82,
      legalFees: 70,
      totalClaim: 1282.82,
      paymentUrl: 'https://example.com/pay'
    });

    expect(bytes.length).toBeGreaterThan(500);
    const header = Buffer.from(bytes.slice(0, 4)).toString('utf8');
    expect(header).toBe('%PDF');
  });
});
