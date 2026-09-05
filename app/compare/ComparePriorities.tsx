"use client";

import { useRef, useState } from "react";
import { COMPARE_PREFERENCES } from "@/lib/types";
import { movePreference, preferenceWeights } from "@/lib/comparePriorities";
import styles from "./ComparePriorities.module.css";

type Props = {
  selected: string[];
  onChange: (preferences: string[]) => void;
  priority: boolean;
  onPriorityChange: (priority: boolean) => void;
};

export default function ComparePriorities({ selected, onChange, priority, onPriorityChange }: Props) {
  const dragging = useRef<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const weights = preferenceWeights(selected.length, priority);
  const available = COMPARE_PREFERENCES.filter((item) => !selected.includes(item.id));
  const label = (id: string) => COMPARE_PREFERENCES.find((item) => item.id === id)?.label ?? id;

  // Move focus with the item so keyboard and screen-reader users keep their place.
  function focusItem(id?: string) {
    requestAnimationFrame(() => {
      const selector = id ? `[data-preference="${id}"]` : "[data-add]";
      root.current?.querySelector<HTMLElement>(selector)?.focus();
    });
  }

  function move(id: string, destination: number) {
    if (!priority) return;
    const next = movePreference(selected, selected.indexOf(id), destination);
    if (next === selected) return;
    onChange(next);
    setAnnouncement(`${label(id)} moved to position ${destination + 1}.`);
    focusItem(id);
  }

  function remove(id: string, index: number) {
    const next = selected.filter((item) => item !== id);
    onChange(next);
    setAnnouncement(`${label(id)} removed.`);
    focusItem(next[Math.min(index, next.length - 1)]);
  }

  return (
    <div ref={root} className={styles.editor}>
      <fieldset className={styles.mode}>
        <legend>How important are your choices?</legend>
        <label><input type="radio" name="priority-mode" checked={!priority}
          onChange={() => onPriorityChange(false)} /> Equal importance</label>
        <label><input type="radio" name="priority-mode" checked={priority}
          onChange={() => onPriorityChange(true)} /> Set priority</label>
      </fieldset>
      <p className={styles.hint}>
        {priority ? "Most important first. Drag a row, or use Up and Down on any device."
          : "All selected categories have equal weight. Switch to Set priority to try an order."}
      </p>
      <p className={styles.notice}>
        <strong>Ranking method:</strong> scores normalise town-wide facility counts by category,
        then apply these weights; they do not measure nearby walking access.
      </p>

      {/* Native drag works on desktop; Up/Down buttons also work with touch and keyboard. */}
      <ol className={styles.list} aria-label="Selected preferences">
        {selected.map((id, index) => (
          <li key={id} data-preference={id} tabIndex={-1}
            draggable={priority} className={`${styles.row} ${over === id ? styles.over : ""}`}
            onDragStart={(event) => {
              dragging.current = id;
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", id);
            }}
            onDragOver={(event) => {
              if (!priority || !dragging.current) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setOver(id);
            }}
            onDrop={(event) => {
              event.preventDefault();
              // Accept only a drag started inside this preference list.
              if (dragging.current) move(dragging.current, index);
              dragging.current = null;
              setOver(null);
            }}
            onDragEnd={() => { dragging.current = null; setOver(null); }}>
            <span className={styles.position} aria-hidden="true">{priority ? index + 1 : "="}</span>
            <div className={styles.description}>
              <strong>{label(id)}</strong>
              <span>{(weights[index] * 100).toFixed(1)}% {priority ? "ranking weight" : "equal weight"}</span>
            </div>
            <div className={styles.actions}>
              <button type="button" disabled={!priority || index === 0}
                aria-label={`Move ${label(id)} up`} onClick={() => move(id, index - 1)}>Up</button>
              <button type="button" disabled={!priority || index === selected.length - 1}
                aria-label={`Move ${label(id)} down`} onClick={() => move(id, index + 1)}>Down</button>
              <button type="button" aria-label={`Remove ${label(id)}`}
                onClick={() => remove(id, index)}>Remove</button>
            </div>
          </li>
        ))}
      </ol>
      {selected.length === 0 && <p className={styles.hint}>No preferences selected. Add a category below to see results.</p>}

      {available.length > 0 && <div className={styles.add} role="group" aria-label="Add a preference">
        <p>Add another category</p>
        {available.map((item) => <button type="button" key={item.id} data-add
          onClick={() => {
            onChange([...selected, item.id]);
            setAnnouncement(`${item.label} added at the end.`);
            focusItem(item.id);
          }}>Add {item.label}</button>)}
      </div>}
      <p className={styles.srOnly} role="status">{announcement}</p>
    </div>
  );
}
