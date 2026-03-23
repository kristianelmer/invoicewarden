import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email required"),
  company: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
