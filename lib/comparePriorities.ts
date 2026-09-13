// Move one preference without changing the original array.
export function movePreference(items: string[], from: number, to: number): string[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Build the ranking weights from the visible priority order.
export function preferenceWeights(count: number, priority: boolean): number[] {
  return Array.from({ length: count }, (_, index) =>
    priority ? (count - index) / (count * (count + 1) / 2) : 1 / count,
  );
}
