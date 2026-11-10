import { z } from "zod";

export const emailSchema = z.string().email().max(254).transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(12).max(128);
export const grades = z.number().int().min(1).max(12);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const tokenSchema = z.object({ token: z.string().min(32).max(128) });
