import type { PoiCategory } from "@/lib/types";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

export function IconCategory({
  category,
  size = 18
}: {
  category: PoiCategory;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {category === "food" && (
        <g {...stroke}>
          <path d="M8 3v10M6 3.5c0 3 2 3 2 6M10 3.5c0 3-2 3-2 6M16 4v7c0 2-1.2 3-3 3h-1" />
          <path d="M8 13v8M16 14v7" />
        </g>
      )}
      {category === "shops" && (
        <g {...stroke}>
          <path d="M4 8h16l-1.2 11H5.2L4 8Z" />
          <path d="M8 8V6.5A4 4 0 0 1 16 6.5V8" />
        </g>
      )}
      {category === "gym" && (
        <g {...stroke}>
          <path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12" />
        </g>
      )}
      {category === "grocery" && (
        <g {...stroke}>
          <path d="M5 8h14l-1 11H6L5 8Z" />
          <path d="M9 8V7a3 3 0 0 1 6 0v1" />
          <path d="M9 13h.01M15 13h.01" />
        </g>
      )}
      {category === "gp" && (
        <g {...stroke}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8v8M8 12h8" />
        </g>
      )}
      {category === "pharmacy" && (
        <g {...stroke}>
          <path d="M8 4h8l3 6v10H5V10L8 4Z" />
          <path d="M12 11v6M9 14h6" />
        </g>
      )}
      {category === "park" && (
        <g {...stroke}>
          <path d="M12 21V11" />
          <path d="M12 14c-4-1-6-4.2-6-7.2C6 5 8.5 3.5 12 5c3.5-1.5 6 0 6 1.8C18 9.8 16 13 12 14Z" />
        </g>
      )}
      {category === "museum" && (
        <g {...stroke}>
          <path d="M4 10.5 12 5l8 5.5" />
          <path d="M6 10.5V19h12v-8.5" />
          <path d="M4 19h16M9 19v-5h6v5" />
        </g>
      )}
      {category === "hospital" && (
        <g {...stroke}>
          <path d="M5 21V8l7-5 7 5v13" />
          <path d="M12 11v6M9 14h6" />
        </g>
      )}
      {category === "school" && (
        <g {...stroke}>
          <path d="M4 10.5 12 5l8 5.5" />
          <path d="M6 11v8h12v-8" />
          <path d="M10 19v-4h4v4" />
        </g>
      )}
      {category === "library" && (
        <g {...stroke}>
          <path d="M5 5h5.5a3 3 0 0 1 3 3v11a2.5 2.5 0 0 0-2.5-2.5H5V5Z" />
          <path d="M19 5h-5.5a3 3 0 0 0-3 3v11a2.5 2.5 0 0 1 2.5-2.5H19V5Z" />
        </g>
      )}
      {category === "community" && (
        <g {...stroke}>
          <circle cx="9" cy="9" r="2.4" />
          <circle cx="16" cy="10" r="2.1" />
          <path d="M4.5 18c.6-2.4 2.4-3.6 4.5-3.6S13 15.6 13.5 18" />
          <path d="M13 18c.4-1.8 1.7-2.8 3.2-2.8 1.6 0 2.8 1 3.3 2.8" />
        </g>
      )}
      {category === "transit" && (
        <g {...stroke}>
          <rect x="6" y="4" width="12" height="14" rx="2" />
          <path d="M6 11h12M10 18l-2 2M14 18l2 2M9 7.5h.01M15 7.5h.01" />
        </g>
      )}
    </svg>
  );
}

export function IconLocate({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...stroke}>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21" />
        <circle cx="12" cy="12" r="7.2" />
      </g>
    </svg>
  );
}
