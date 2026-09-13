"use client";

// Extend the current compare panel; keep all ranking logic in CompareClient.
// The draft is editable and never becomes a confirmed preference automatically.
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { COMPARE_PREFERENCES } from "@/lib/types";
import { assistantPredictionSchema, preferenceKey, suggestedPreferences } from "@/lib/assistantPreferences";
import styles from "./AssistantPanel.module.css";

type Message = { role: "user" | "assistant"; text: string };
type Draft = { preferences: string[]; baseKey: string; note: string };
type Props = { selected: string[]; onApply: (preferences: string[]) => void };

function names(ids: string[]): string {
  return COMPARE_PREFERENCES.filter((preference) => ids.includes(preference.id))
    .map((preference) => preference.label).join(", ") || "None";
}

export default function AssistantPanel({ selected, onApply }: Props) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const controller = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef<HTMLFieldSetElement>(null);
  const currentKey = preferenceKey(selected);
  const stale = draft !== null && draft.baseKey !== currentKey;
  const hasDraft = draft !== null;

  // Stop an unfinished web request when this panel is closed.
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (hasDraft) draftRef.current?.focus();
  }, [hasDraft]);

  function say(text: string) {
    setMessages((previous) => [...previous, { role: "assistant", text }]);
  }

  function closeDraft() {
    setDraft(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function applyDraft() {
    // Refuse stale drafts after the user changes the main filters.
    if (!draft || stale) return;
    onApply([...draft.preferences]);
    say(`Applied preferences: ${names(draft.preferences)}.`);
    closeDraft();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || text.length > 500 || isSending || hasDraft) return;
    setError(null);
    setIsSending(true);
    setInput("");
    setMessages((previous) => [...previous, { role: "user", text }]);
    const requestController = new AbortController();
    controller.current = requestController;
    const timeout = window.setTimeout(() => requestController.abort(), 25000);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }), signal: requestController.signal,
      });
      if (!response.ok) {
        throw new Error(`AI request failed (${response.status}). Check the Python service or use Edit preferences.`);
      }
      const prediction = assistantPredictionSchema.parse(await response.json());
      const note = prediction.status === "needs_confirmation"
        ? `Suggested additions: ${names(prediction.include)}. Suggested removals: ${names(prediction.exclude)}. Check every selection below.`
        : "I could not reliably identify changes. Your current preferences are unchanged; choose the selections below yourself.";
      say(note);
      setDraft({
        preferences: suggestedPreferences(selected, prediction), baseKey: currentKey, note,
      });
    } catch (err) {
      if (!requestController.signal.aborted) {
        setError(err instanceof Error ? err.message : "AI request failed. Use Edit preferences.");
      } else {
        setError("The request was cancelled or timed out. Your preferences were not changed.");
      }
      setInput(text);
    } finally {
      window.clearTimeout(timeout);
      setIsSending(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="assistant-title">
      <h2 id="assistant-title">Relocation assistant</h2>
      <p className={styles.note}>
        Local AI experiment. Suggestions may be wrong. Review and apply them yourself.
        New messages update existing preferences; unmentioned preferences stay selected.
      </p>
      <p className={styles.current} aria-live="polite">
        <strong>Currently applied:</strong> {names(selected)}
      </p>

      {/* Recent conversation is kept only while this page remains open. */}
      {messages.length > 0 && (
        <div className={styles.messages} role="log" aria-label="Chat messages" tabIndex={0}>
          {messages.map((message, index) => (
            <p key={index} className={`${styles.message} ${styles[message.role]}`}>
              <strong>{message.role === "user" ? "You" : "Assistant"}</strong><br />
              {message.text}
            </p>
          ))}
        </div>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="assistant-input">Describe your preferences in English</label>
        <div className={styles.controls}>
          <input ref={inputRef} id="assistant-input" type="text" value={input}
            onChange={(event) => setInput(event.target.value)} maxLength={500}
            placeholder="e.g. Schools are important; parks are not a priority"
            disabled={isSending || hasDraft} />
          <button type="submit" disabled={isSending || hasDraft || !input.trim()}>
            {isSending ? "Analysing..." : "Suggest changes"}
          </button>
        </div>
      </form>
      {isSending && <p role="status">Waiting for the local model. Nothing has been applied.</p>}

      {/* Fixed button actions do not call the model. Even clearing needs confirmation. */}
      <div className={styles.actions}>
        <button type="button" disabled={isSending || hasDraft} onClick={() => {
          setError(null);
          setDraft({ preferences: [...selected], baseKey: currentKey, note: "Choose exactly which preferences you want applied." });
        }}>Edit preferences</button>
        <button type="button" disabled={isSending || hasDraft} onClick={() => {
          setError(null);
          setDraft({ preferences: [], baseKey: currentKey, note: "Review this empty selection before clearing all preferences." });
        }}>Clear preferences</button>
      </div>

      {draft && (
        <fieldset ref={draftRef} tabIndex={-1} className={styles.draft} aria-describedby="draft-note">
          <legend>Review preferences before applying</legend>
          <p id="draft-note">{draft.note}</p>
          {stale && <p role="alert" className={styles.error}>
            The main filters changed. Discard this draft and start again to keep your latest choices.
          </p>}
          <div className={styles.choices}>
            {COMPARE_PREFERENCES.map((preference) => (
              <label key={preference.id}>
                <input type="checkbox" checked={draft.preferences.includes(preference.id)} disabled={stale}
                  onChange={() => setDraft((previous) => previous && ({
                    ...previous,
                    preferences: previous.preferences.includes(preference.id)
                      ? previous.preferences.filter((id) => id !== preference.id)
                      : [...previous.preferences, preference.id],
                  }))} />
                {preference.label}
              </label>
            ))}
          </div>
          <p><strong>Will be applied:</strong> {names(draft.preferences)}</p>
          {draft.preferences.length === 0 && <p>No ranking will be shown until you choose at least one preference.</p>}
          <div className={styles.actions}>
            <button className={styles.primary} type="button" disabled={stale} onClick={applyDraft}>Apply preferences</button>
            <button type="button" onClick={() => { say("Draft discarded. Your preferences were not changed."); closeDraft(); }}>Discard draft</button>
          </div>
        </fieldset>
      )}
    </section>
  );
}
