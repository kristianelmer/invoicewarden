import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatMoney, type LegalAssessment } from "@/lib/legal";

type BuildCorrectedInvoicePdfInput = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  customerName: string;
  customerEmail: string;
  jurisdiction: string;
  originalAmountCents: number;
  currency: string;
  assessment: LegalAssessment;
  paymentUrl: string;
  senderName: string;
  senderEmail: string;
};

export async function buildCorrectedInvoicePdf(input: BuildCorrectedInvoicePdfInput) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const left = 48;

  function line(text: string, opts?: { size?: number; bold?: boolean; color?: [number, number, number] }) {
    const size = opts?.size ?? 11;
    const useFont = opts?.bold ? bold : font;
    const color = opts?.color ? rgb(opts.color[0], opts.color[1], opts.color[2]) : rgb(0, 0, 0);
    page.drawText(text, { x: left, y, size, font: useFont, color });
    y -= size + 6;
  }

  line("INVOICEWARDEN", { bold: true, size: 16 });
  line("Corrected Invoice Notice", { bold: true, size: 14 });
  y -= 4;

  line(`Invoice: ${input.invoiceNumber}`, { bold: true });
  line(`Issue date: ${input.issueDate}`);
  line(`Due date: ${input.dueDate}`);
  line(`Jurisdiction: ${input.jurisdiction}`);
  line(`Law basis: ${input.assessment.lawLabel}`);
  y -= 6;

  line("Bill to", { bold: true });
  line(`${input.customerName}`);
  line(`${input.customerEmail}`);
  y -= 6;

  line("Breakdown", { bold: true });
  line(`Original invoice amount: ${formatMoney(input.originalAmountCents, input.currency)}`);

  if (input.assessment.statutoryInterestCents > 0) {
    line(`Statutory interest: ${formatMoney(input.assessment.statutoryInterestCents, input.currency)}`);
  }
  if (input.assessment.fixedRecoveryFeeCents > 0) {
    line(`Fixed recovery fee: ${formatMoney(input.assessment.fixedRecoveryFeeCents, input.currency)}`);
  }
  if (input.assessment.litigationExposureCents > 0) {
    line(`Statutory damages exposure: ${formatMoney(input.assessment.litigationExposureCents, input.currency)}`);
  }
  if (input.assessment.administrativeFineCents > 0) {
    line(`Administrative fine exposure: ${formatMoney(input.assessment.administrativeFineCents, input.currency)}`);
  }

  y -= 8;
  line(`Updated total due: ${formatMoney(input.assessment.updatedTotalCents, input.currency)}`, {
    bold: true,
    size: 13,
    color: [0.7, 0.1, 0.1],
  });

  if (input.assessment.dailyInterestCents > 0) {
    line(
      `Daily accrual: ${formatMoney(input.assessment.dailyInterestCents, input.currency)} per day`,
      { size: 10 }
    );
  }

  y -= 10;
  line("Payment", { bold: true });
  line(`Secure payment link: ${input.paymentUrl}`, { size: 10 });

  y -= 16;
  line("Notice", { bold: true });
  line(
    `This document was generated automatically by InvoiceWarden for collections workflow support.`,
    { size: 9 }
  );
  line(
    `It is not legal advice. For legal interpretation, consult qualified counsel in your jurisdiction.`,
    { size: 9 }
  );

  y -= 12;
  line(`Sender: ${input.senderName} <${input.senderEmail}>`, { size: 9 });

  const bytes = await pdfDoc.save();
  return bytes;
}
