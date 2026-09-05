"use client";

import { useEffect, useRef, useState } from "react";
import ChatPanel from "./ChatPanel";
import type { ChatReply } from "@/lib/chatRecommendations";
import styles from "./FloatingAssistant.module.css";

export default function FloatingAssistant({ onApply }: {
  onApply: (selection: Pick<ChatReply, "preferences" | "area">) => void;
}) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    // This is a non-modal panel: users can still interact with the comparison page.
    const target = panel.current?.querySelector<HTMLElement>("#chat-input:not(:disabled)")
      ?? panel.current?.querySelector<HTMLElement>("button");
    target?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);

  return (
    <>
      {/* Hide instead of unmounting so closing the panel keeps this visit's history. */}
      <aside ref={panel} id="relocation-chat" hidden={!open}
        className={styles.drawer} aria-labelledby="chat-title">
        <div className={styles.header}>
          <h2 id="chat-title">Relocation assistant</h2>
          <button type="button" onClick={close} aria-label="Close chat">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
        <ChatPanel onApply={onApply} />
      </aside>

      <button ref={launcher} type="button" className={styles.launcher}
        aria-label={open ? "Close relocation assistant" : "Open relocation assistant"}
        aria-controls="relocation-chat" aria-expanded={open}
        title="Relocation assistant" onClick={() => open ? close() : setOpen(true)}>
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <rect x="4" y="7" width="16" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 3v4M1 12v5m22-5v5M8 17h8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="8.5" cy="12" r="1.2" fill="currentColor" />
          <circle cx="15.5" cy="12" r="1.2" fill="currentColor" />
          <circle cx="12" cy="3" r="1.5" fill="currentColor" />
        </svg>
      </button>
    </>
  );
}
