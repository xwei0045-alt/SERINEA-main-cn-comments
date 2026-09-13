"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { z } from "zod";
import styles from "./AssistantPanel.module.css";
import Link from "next/link";
import { chatReplySchema } from "@/lib/chatRecommendations";
import type { ChatReply, ChatSelection } from "@/lib/chatRecommendations";

type Message = { role: "user" | "assistant"; content: string };

// Keep replies compatible with the next request's message limit.
const replySchema = chatReplySchema;
const errorSchema = z.object({
  error: z.union([z.string(), z.object({ message: z.string() })]),
});

export default function ChatPanel({ onApply, context }: {
  context: ChatSelection;
  onApply: (selection: ChatSelection) => void;
}) {
  // This page owns the history. It is not written to browser storage.
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestion, setSuggestion] = useState<ChatReply | null>(null);
  const [applied, setApplied] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const isSending = pending !== null;
  const chatFull = messages.length >= 20;

  const resetChat = useCallback(() => {
    // Cancel the old request before starting a new conversation.
    requestRef.current?.abort();
    requestRef.current = null;
    setMessages([]);
    setSuggestion(null);
    setApplied(false);
    setInput("");
    setPending(null);
    setError(null);
  }, []);

  useEffect(() => {
    // Clear history when leaving or restoring a cached browser page.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resetChat();
    };
    window.addEventListener("pagehide", resetChat);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
      window.removeEventListener("pagehide", resetChat);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [resetChat]);

  useEffect(() => {
    // Show the newest message without moving keyboard focus.
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, pending]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || text.length > 2000 || requestRef.current || chatFull) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    if (nextMessages.reduce((total, message) => total + message.content.length, 0) > 32000) {
      setError("This chat is full. Select New chat to continue.");
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setPending(text);
    // Hide old suggestions while a new request is being interpreted.
    setSuggestion(null);
    setApplied(false);
    setInput("");
    setError(null);
    const timeout = window.setTimeout(() => controller.abort(), 35000);

    try {
      // Send the complete conversation, including the latest question.
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, context }),
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const result = errorSchema.safeParse(body);
        const detail = result.success ? result.data.error : null;
        throw new Error(typeof detail === "string" ? detail
          : detail?.message ?? `Chat request failed (${response.status}). Please try again.`);
      }

      const result = replySchema.safeParse(body);
      if (!result.success) {
        throw new Error("The reply was empty or too long. Please try a shorter question.");
      }

      // Ignore replies from a conversation that was reset or closed.
      if (requestRef.current !== controller || controller.signal.aborted) return;
      setMessages([...nextMessages, { role: "assistant", content: result.data.reply }]);
      setSuggestion(result.data);
    } catch (err) {
      if (requestRef.current !== controller) return;
      setError(controller.signal.aborted
        ? "The reply timed out. Please try again."
        : err instanceof Error ? err.message : "The connection failed. Please try again.");
      // Failed messages stay out of history so a retry has the right role order.
      setInput(text);
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        setPending(null);
      }
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="chat-title">
      {messages.length === 0 && <p className={styles.note}>
        Find matching towns or explore one town using our data. Confirm before updating your filters.
        Closing keeps this chat; refreshing or leaving clears it.
      </p>}
      <div className={styles.actions}>
        <button type="button" onClick={() => { resetChat(); inputRef.current?.focus(); }}>
          New chat
        </button>
      </div>

      <div ref={logRef} className={styles.messages} style={{ maxHeight: "min(65vh, 520px)" }} role="log" aria-label="Chat messages" tabIndex={0}>
        {messages.length === 0 && pending === null && (
          <p className={styles.note}>Which everyday services matter most to you?</p>
        )}
        {messages.map((message, index) => (
          <p key={index} data-chat-role={message.role} className={`${styles.message} ${styles[message.role]}`}>
            <strong>{message.role === "user" ? "You" : "Assistant"}</strong><br />
            {message.content}
          </p>
        ))}
        {pending !== null && (
          <p data-chat-role="user" className={`${styles.message} ${styles.user}`}><strong>You</strong><br />{pending}</p>
        )}
      </div>

      {suggestion && suggestion.places.length > 0 && (
        <div className={styles.actions} aria-label="Recommendation actions">
          {/* The user confirms before model-extracted preferences change the page. */}
          {suggestion.preferences.length > 0 && <button type="button" disabled={isSending || applied} onClick={() => {
            onApply({ preferences: suggestion.preferences, priority: suggestion.priority, area: suggestion.area });
            setApplied(true);
          }}>{applied ? "Preferences applied" : "Use these preferences"}</button>}
          <nav aria-label="Recommended towns on map">
            <span>Map:</span>
            {suggestion.places.map((place, index) => place.latitude != null && place.longitude != null && (
              <Link key={index} aria-label={`View ${place.name} on map`}
                href={`/map?lat=${place.latitude}&lng=${place.longitude}&town=${encodeURIComponent(place.name)}`}>
                {place.name}
              </Link>
            ))}
          </nav>
          {applied && <span role="status">Preferences applied to the page.</span>}
        </div>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}
      {isSending && <p role="status">Thinking…</p>}
      {chatFull && <p role="status">You have reached this chat's 10-turn limit. Select New chat to continue.</p>}

      <form onSubmit={handleSubmit}>
        <label htmlFor="chat-input">Your message</label>
        <div className={styles.controls}>
          <input ref={inputRef} id="chat-input" type="text" value={input}
            onChange={(event) => setInput(event.target.value)} maxLength={2000}
            placeholder="e.g. Schools matter most; parks are less important"
            disabled={isSending || chatFull} />
          <button type="submit" disabled={isSending || chatFull || !input.trim()}>
            {isSending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
