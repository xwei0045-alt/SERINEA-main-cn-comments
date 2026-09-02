import type { ReactNode } from "react";

// Warm the tile and routing hosts before the map asks for them.

export default function MapLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://tile.openstreetmap.org" />
      <link rel="dns-prefetch" href="https://routing.openstreetmap.de" />
      {children}
    </>
  );
}
