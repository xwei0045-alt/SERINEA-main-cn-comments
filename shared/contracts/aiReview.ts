import { z } from "zod";
import { IMPORTANCE_LEVELS } from "@/lib/recommendationAssistant";

export const aiReviewRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000)
}).strict();

export const aiReviewResultSchema = z.object({
  preferences: z.array(z.object({
    target: z.string().trim().min(1).max(100),
    importance: z.enum(IMPORTANCE_LEVELS)
  }).strict()).max(50),
  unsupported: z.array(z.string().trim().min(1).max(200)).max(20)
}).strict();

export const aiReviewResponseSchema = z.object({
  agreed: z.boolean(),
  summary: z.string(),
  source: z.enum(["cache", "inference", "fallback"]),
  modelVersion: z.string(),
  policyVersion: z.string()
}).strict();

export type AiReviewResult = z.infer<typeof aiReviewResultSchema>;
export type AiReviewResponse = z.infer<typeof aiReviewResponseSchema>;
