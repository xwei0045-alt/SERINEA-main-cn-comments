/** Statewide plate for regional Victoria grid references. */
export const PLATE = {
  west: 140.9,
  east: 150.0,
  north: -33.98,
  south: -39.2
} as const;

const COLS = "ABCDEFGHIJKL";
const ROWS = 10;

export function gridRef(lat: number, lng: number): string {
  const c = Math.floor(((lng - PLATE.west) / (PLATE.east - PLATE.west)) * COLS.length);
  const r = Math.floor(((lat - PLATE.north) / (PLATE.south - PLATE.north)) * ROWS);
  const col = COLS[Math.min(Math.max(c, 0), COLS.length - 1)];
  const row = Math.min(Math.max(r + 1, 1), ROWS);
  return `${col}${row}`;
}

export function project(
  lat: number,
  lng: number,
  width = 1000,
  height = 780
): { x: number; y: number } {
  return {
    x: ((lng - PLATE.west) / (PLATE.east - PLATE.west)) * width,
    y: ((lat - PLATE.north) / (PLATE.south - PLATE.north)) * height
  };
}

export function pathFrom(points: { lat: number; lng: number }[], width = 1000, height = 780) {
  return points
    .map((p, i) => {
      const { x, y } = project(p.lat, p.lng, width, height);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}
