import { z } from "zod";
import { COMPARE_PREFERENCES } from "./types";

// Reuse the same category IDs as the Compare page.
export const preferenceIds = COMPARE_PREFERENCES.map(item => item.id) as [string, ...string[]];
const preference = z.enum(preferenceIds);
const selection = z.array(preference).max(preferenceIds.length).refine(
  items => new Set(items).size === items.length, "Duplicate preferences.",
);

export const chatSelectionSchema = z.object({
  preferences: selection,
  priority: z.boolean(),
  area: z.string().max(60),
}).strict();
export type ChatSelection = z.infer<typeof chatSelectionSchema>;

// The model extracts requirements, never recommended towns, scores or counts.
export const planSchema = z.object({
  intent: z.enum(["recommend", "town_details"]),
  town: z.string().max(80),
  include: selection,
  priority: z.boolean(),
  bonus: selection,
  exclude: selection,
  area: z.string().max(60),
  unverified: z.array(z.string().max(80)).max(3),
}).strict();
export type RecommendationPlan = z.infer<typeof planSchema>;

export const chatRequestSchema = z.object({
  context: chatSelectionSchema.optional(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4000),
  }).strict()).min(1).max(21),
}).strict().refine(({ messages }) =>
  messages.length % 2 === 1 &&
  messages.every((message, index) =>
    message.role === (index % 2 === 0 ? "user" : "assistant") &&
    (message.role !== "user" || message.content.length <= 2000)) &&
  messages.reduce((total, message) => total + message.content.length, 0) <= 32000,
);

export const chatReplySchema = z.object({
  reply: z.string().min(1).max(4000),
  preferences: selection,
  priority: z.boolean(),
  area: z.string().max(60),
  places: z.array(z.object({
    name: z.string(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })).max(3),
}).strict();
export type ChatReply = z.infer<typeof chatReplySchema>;

// Follow the current dataset contract rather than maintaining a second category list.
export const preferenceNames: Record<string, string> = Object.fromEntries(
  COMPARE_PREFERENCES.map(({ id, label }) => [id, label]),
);

// The second Groq call composes an explanation from these verified statements.
export function explanationOptions(result: import("@/shared/contracts/compare").CompareResponse): [string, ...string[]] {
  const top = result.items[0];
  return [
    `${top.locality} ranks first for the selected preferences and weights.`,
    "Each category is normalised before weights are applied, so a high-volume category does not automatically dominate.",
    "The score describes relative facility records, not overall suitability or service quality.",
    ...top.breakdown.filter(item => item.count > 0).map(item =>
      `${top.locality} has ${item.count} ${item.label} records in the current dataset.`),
  ];
}
