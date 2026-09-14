import type { RecommendationExtraction } from "@/lib/recommendationAssistant";

// Public repository maintained for the SERINEA browser model. The model is
// downloaded only when the user enables Local Qwen review.
export const TINY_MODEL_ID = "serinea-qwen3-browser-model/serinea-qwen3-browser-model";

type Progress = { status?: string; file?: string; progress?: number };
type Generator = (
  messages: Array<{ role: "system" | "user"; content: string }>,
  options: Record<string, unknown>
) => Promise<Array<{ generated_text: Array<{ content: string }> }>>;

let generatorPromise: Promise<Generator> | undefined;

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?|```/gi, "");
  for (const match of cleaned.matchAll(/\{/g)) {
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let index = match.index; index < cleaned.length; index += 1) {
      const char = cleaned[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === "{") depth += 1;
      else if (char === "}" && --depth === 0) {
        try {
          return JSON.parse(cleaned.slice(match.index, index + 1)) as Record<string, unknown>;
        } catch {
          break;
        }
      }
    }
  }
  throw new Error("The local model did not return valid JSON.");
}

async function loadTiny(onProgress: (progress: Progress) => void): Promise<Generator> {
  if (!generatorPromise) {
    generatorPromise = import("@huggingface/transformers").then(async ({ pipeline }) =>
      pipeline("text-generation", TINY_MODEL_ID, {
        device: "webgpu",
        dtype: "q4f16",
        progress_callback: onProgress
      }) as unknown as Generator
    );
  }
  return generatorPromise;
}

const SYSTEM = `You review a SERINEA preference extraction. Return one JSON object and no prose.
Schema: {"preferences":[{"target":"supported_target","importance":"very_high|high|medium|low|very_low"}],"unsupported":["short label"]}
Copy only explicit positive services from the user message. Exclude negated services. Child age never implies school. Never rank or invent towns. /no_think`;

export async function reviewWithLocalTiny(
  message: string,
  deterministic: RecommendationExtraction,
  onProgress: (progress: Progress) => void
): Promise<{ agreed: boolean; summary: string }> {
  const generator = await loadTiny(onProgress);
  const allowed = deterministic.preferences.map(({ target, importance }) => ({ target, importance }));
  const output = await generator(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `ALLOWED CATALOGUE MATCHES: ${JSON.stringify(allowed)}\nUNSUPPORTED MATCHES: ${JSON.stringify(deterministic.unsupported)}\nUSER MESSAGE: ${message}\n/no_think`
      }
    ],
    { max_new_tokens: 220, do_sample: false }
  );
  const parsed = parseJson(output[0]?.generated_text?.at(-1)?.content ?? "");
  const preferences = Array.isArray(parsed.preferences)
    ? parsed.preferences
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({ target: item.target, importance: item.importance }))
    : [];
  const expected = JSON.stringify(allowed.slice().sort((a, b) => a.target.localeCompare(b.target)));
  const actual = JSON.stringify(
    preferences.slice().sort((a, b) => String(a.target).localeCompare(String(b.target)))
  );
  const agreed = expected === actual;

  return {
    agreed,
    summary: agreed
      ? "Local Qwen review agreed with the catalogue extraction."
      : "Local Qwen review differed, so the website kept the deterministic extraction for you to confirm."
  };
}

