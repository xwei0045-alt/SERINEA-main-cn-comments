import { z } from "zod";
import { COMPARE_PREFERENCES } from "./types";

// Reuse the same category IDs as the Compare page.
export const preferenceIds = COMPARE_PREFERENCES.map(item => item.id) as [string, ...string[]];
const preference = z.enum(preferenceIds);
const selection = z.array(preference).max(preferenceIds.length);

// The model extracts requirements, never recommended towns, scores or counts.
export const planSchema = z.object({
  intent: z.enum(["recommend", "town_details"]),
  town: z.string().max(80),
  include: selection,
  bonus: selection,
  exclude: selection,
  area: z.string().max(60),
  unverified: z.array(z.string().max(80)).max(3),
}).strict();
export type RecommendationPlan = z.infer<typeof planSchema>;

export const chatRequestSchema = z.object({
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
  area: z.string().max(60),
  places: z.array(z.object({
    name: z.string(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })).max(3),
}).strict();
export type ChatReply = z.infer<typeof chatReplySchema>;

// English labels describe the actual scope of each dataset category.
export const preferenceNames: Record<string, string> = {
  school: "Education (mixed category)",
  grocery: "Supermarkets / convenience stores",
  gp: "Doctors / clinics / dentists",
  hospital: "Hospitals",
  pharmacy: "Pharmacies",
  park: "Parks / green spaces / playgrounds",
  gym: "Sports centres",
  library: "Libraries",
  community: "Community facilities",
  transit: "Public transport stop records",
};
