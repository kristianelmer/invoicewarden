import { z } from "zod";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string) {
  if (!ISO_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const dateString = z
  .string()
  .trim()
  .refine((value) => isIsoDate(value), "Date must be YYYY-MM-DD");

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Valid email required"),
  company: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const invoiceSchema = z
  .object({
    customer_id: z.string().uuid(),
    invoice_number: z.string().trim().min(1).max(100),
    currency: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine((v) => /^[A-Z]{3}$/.test(v), "Currency must be a 3-letter ISO code")
      .default("EUR"),
    amount_cents: z.number().int().positive(),
    issue_date: dateString,
    due_date: dateString,
    jurisdiction: z.enum(["UK", "US_NY", "US_CA"]).default("UK"),
    project_completed_at: dateString.optional().nullable(),
    services_rendered_at: dateString.optional().nullable(),
    contract_requested_refused: z.boolean().optional().default(false),
    payment_url: z.string().trim().url().optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.due_date < data.issue_date) {
      ctx.addIssue({
        code: "custom",
        path: ["due_date"],
        message: "Due date cannot be earlier than issue date",
      });
    }

    if (data.jurisdiction === "US_NY" && data.project_completed_at) {
      if (data.project_completed_at < data.issue_date) {
        ctx.addIssue({
          code: "custom",
          path: ["project_completed_at"],
          message: "Project completion date cannot be earlier than issue date",
        });
      }
    }

    if (data.jurisdiction === "US_CA" && data.services_rendered_at) {
      if (data.services_rendered_at < data.issue_date) {
        ctx.addIssue({
          code: "custom",
          path: ["services_rendered_at"],
          message: "Services rendered date cannot be earlier than issue date",
        });
      }
    }
  });

export type InvoiceInput = z.infer<typeof invoiceSchema>;
