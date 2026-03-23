import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email required"),
  company: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const invoiceSchema = z.object({
  customer_id: z.string().uuid(),
  invoice_number: z.string().min(1).max(100),
  currency: z.string().min(3).max(6).default("EUR"),
  amount_cents: z.number().int().positive(),
  issue_date: z.string().min(10),
  due_date: z.string().min(10),
  notes: z.string().max(2000).optional().nullable(),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
