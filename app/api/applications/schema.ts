import { z } from "zod";

const genders = ["Male", "Female"] as const;
const btechBranches = ["CSE Core", "CSE AI", "CSE DS", "CSE CS", "CSE CPS", "IT", "MNC", "ECE", "PNC"] as const;

export const applicationSchema = z.object({
  positionIds: z.array(z.uuid()).min(1).max(4).refine((ids) => new Set(ids).size === ids.length),
  fullName: z.string().trim().min(2).max(120),
  scholarId: z.string().trim().min(4).max(24),
  branch: z.enum(btechBranches),
  year: z.enum(["1", "2", "3", "4"]),
  gender: z.enum(genders),
  phone: z.string().trim().min(7).max(24),
  email: z.email().max(254),
  experience: z.string().trim().min(1).max(8_000),
  links: z.string().trim().max(4_000),
  turnstileToken: z.string().max(2_048).optional(),
  website: z.string().max(0).optional(),
});
