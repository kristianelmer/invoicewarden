import { z } from "zod";

export const customerCreateSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(254).optional().or(z.literal("")),
  company: z.string().max(120).optional().or(z.literal(""))
});

export const invoiceCreateSchema = z.object({
  customerId: z.string().uuid(),
  invoiceNumber: z.string().min(1).max(64),
  principal: z.number().positive(),
  dueDate: z.string().date(),
  currency: z.string().length(3).default("GBP")
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
