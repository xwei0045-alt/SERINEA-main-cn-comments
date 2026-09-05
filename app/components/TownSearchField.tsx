"use client";

import { useEffect, useId, useState } from "react";
import { localityApiClient } from "@/frontend/api/LocalityApiClient";
import type { LocalitySummaryItem } from "@/shared/contracts/localities";
import styles from "./TownSearchField.module.css";

/** High enough to return every locality in the regional extract. */
const ALL_MATCHES = 5000;

function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("en-AU")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

type Props = {
  id?: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (item: LocalitySummaryItem) => void;
  placeholder?: string;
};

/**
 * Typeahead over every regional locality / LGA in the Iteration 1 extract.
 * Filters from the first character; returns all ranked matches.
 */
export function TownSearchField({
  id,
  label,
  value,
  onValueChange,
  onSelect,
  placeholder = "Type any regional town…"
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-results`;
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<LocalitySummaryItem[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const query = value.trim();
    if (!query) {
      setMatches([]);
      setNotFound(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      localityApiClient
        .search({ q: query, limit: ALL_MATCHES }, controller.signal)
        .then((response) => {
          setMatches(response.items);
          setNotFound(response.items.length === 0);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          console.error("Town search failed.", error);
          setMatches([]);
          setNotFound(true);
        });
    }, 80);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  return (
    <div className={styles.wrap}>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="search"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 160);
        }}
      />
      {open && matches.length > 0 && (
        <ul id={listId} className={styles.results} role="listbox">
          {matches.map((item) => (
            <li key={`${item.locality}-${item.lgaName}-${item.regionalGroup}`}>
              <button
                type="button"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                }}
              >
                <strong>{titleCase(item.locality)}</strong>
                <span>
                  {titleCase(item.lgaName)}
                  {item.regionalGroup ? ` · ${item.regionalGroup}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && notFound && value.trim().length > 0 && (
        <p className={styles.empty} role="status">
          Not found — “{value.trim()}” is not in our regional towns or LGAs.
        </p>
      )}
    </div>
  );
}
