import { haversineKm } from "@/lib/geo";
import type { LatLng } from "@/lib/types";

/**
 * Small in-memory spatial index used by CSV mode.
 * It avoids scanning all statewide POIs each time the map pin moves.
 */
export class SpatialGridIndex<T extends LatLng> {
  private readonly cells = new Map<string, T[]>();

  constructor(
    items: readonly T[],
    private readonly cellSizeDegrees = 0.02
  ) {
    for (const item of items) {
      const key = this.keyFor(item.lat, item.lng);
      const cell = this.cells.get(key);
      if (cell) cell.push(item);
      else this.cells.set(key, [item]);
    }
  }

  /** Returns points inside a radius after a cheap grid lookup and exact distance check. */
  withinRadius(origin: LatLng, radiusKm: number): T[] {
    const latitudeDelta = radiusKm / 110.574;
    const longitudeScale = Math.max(0.01, Math.cos((origin.lat * Math.PI) / 180));
    const longitudeDelta = radiusKm / (111.32 * longitudeScale);
    const minimumLatitudeCell = this.latitudeCell(origin.lat - latitudeDelta);
    const maximumLatitudeCell = this.latitudeCell(origin.lat + latitudeDelta);
    const minimumLongitudeCell = this.longitudeCell(origin.lng - longitudeDelta);
    const maximumLongitudeCell = this.longitudeCell(origin.lng + longitudeDelta);
    const matches: T[] = [];

    for (
      let latitudeCell = minimumLatitudeCell;
      latitudeCell <= maximumLatitudeCell;
      latitudeCell += 1
    ) {
      for (
        let longitudeCell = minimumLongitudeCell;
        longitudeCell <= maximumLongitudeCell;
        longitudeCell += 1
      ) {
        const candidates = this.cells.get(`${latitudeCell}:${longitudeCell}`) ?? [];
        for (const candidate of candidates) {
          if (haversineKm(origin, candidate) <= radiusKm) matches.push(candidate);
        }
      }
    }

    return matches;
  }

  private keyFor(latitude: number, longitude: number): string {
    return `${this.latitudeCell(latitude)}:${this.longitudeCell(longitude)}`;
  }

  private latitudeCell(latitude: number): number {
    return Math.floor((latitude + 90) / this.cellSizeDegrees);
  }

  private longitudeCell(longitude: number): number {
    return Math.floor((longitude + 180) / this.cellSizeDegrees);
  }
}
