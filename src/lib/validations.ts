import { z } from "zod";
import { isPasswordValid } from "@/lib/password";

const addressSchema = z.object({
  street: z.string().min(1, "Informe a rua"),
  number: z.string().min(1, "Nº"),
  complement: z.string().optional(),
  district: z.string().min(1, "Informe o bairro"),
  city: z.string().min(1, "Informe a cidade"),
  state: z.string().length(2, "UF"),
  zip: z.string().min(8, "CEP inválido"),
});

export const customerSchema = z.object({
  kind: z.enum(["lead", "client"]).default("lead"),
  person_type: z.enum(["individual", "company"]).default("individual"),
  name: z.string().default(""),
  document: z.string().default(""),
  email: z.string().optional(),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).default([]),
  owner_id: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  next_contact_at: z.string().optional(),
});
export type CustomerFormValues = z.infer<typeof customerSchema>;

export const userSchema = z.object({
  name: z.string().min(3, "Informe o nome"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  job_title: z.string().optional(),
  role: z.enum(["super_admin", "admin", "broker", "assistant"]),
  status: z.enum(["active", "inactive"]).default("active"),
});
export type UserFormValues = z.infer<typeof userSchema>;

export const companySchema = z.object({
  legal_name: z.string().min(3, "Informe a razão social"),
  trade_name: z.string().min(2, "Informe o nome fantasia"),
  cnpj: z.string().min(14, "CNPJ inválido"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(8, "Telefone inválido"),
  status: z.enum(["active", "inactive"]).default("active"),
  plan: z.enum(["starter", "professional", "enterprise"]).default("starter"),
  address: addressSchema.partial().optional(),
});
export type CompanyFormValues = z.infer<typeof companySchema>;

export const ticketSchema = z.object({
  title: z.string().min(4, "Descreva o título"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  subject_type: z.enum(["internal", "customer", "carrier", "product", "contract", "quote"]),
  customer_id: z.string().optional(),
  carrier_id: z.string().optional(),
  product_id: z.string().optional(),
  contract_id: z.string().optional(),
  quote_id: z.string().optional(),
  assignee_id: z.string().optional(),
  participant_ids: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  due_at: z.string().optional(),
});
export type TicketFormValues = z.infer<typeof ticketSchema>;

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(3, "Informe seu nome"),
    company: z.string().min(2, "Informe o nome da corretora"),
    email: z.string().email("E-mail inválido"),
    password: z
      .string()
      .refine(isPasswordValid, "Sua senha não atende a todos os requisitos"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .refine(isPasswordValid, "Sua senha não atende a todos os requisitos"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
