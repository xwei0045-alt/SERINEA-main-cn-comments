"use client";

// Leaflet only loads here, not on the landing page.
// We tell the map to resize when the panel changes so phones do not get a grey strip.

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, Polygon, Polyline } from "leaflet";
import type { Isochrone } from "@/lib/reach";
import { poiMarkHtml } from "@/lib/mapMarks";
import { COLOR } from "@/lib/palette";
import type { LatLng, ReachablePoi } from "@/lib/types";

type Props = {
  pin: LatLng;
  hull: Isochrone;
  reachable: ReachablePoi[];
  selectedId: string | null;
  routePath: LatLng[] | null;
  you: LatLng | null;
  navigating: boolean;
  showHull: boolean;
  hasRoute: boolean;
  onPin: (pt: LatLng) => void;
  onSelect: (id: string) => void;
};

export default function ReachMap({
  pin,
  hull,
  reachable,
  selectedId,
  routePath,
  you,
  navigating,
  showHull,
  hasRoute,
  onPin,
  onSelect
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const pinRef = useRef<Marker | null>(null);
  const youRef = useRef<Marker | null>(null);
  const hullRef = useRef<Polygon | null>(null);
  const routeCasingRef = useRef<Polyline | null>(null);
  const routeLineRef = useRef<Polyline | null>(null);
  const dotsRef = useRef<Map<string, Marker>>(new Map());
  const onPinRef = useRef(onPin);
  const onSelectRef = useRef(onSelect);
  const navigatingRef = useRef(navigating);
  const pinPosRef = useRef(pin);
  const [ready, setReady] = useState(false);
  onPinRef.current = onPin;
  onSelectRef.current = onSelect;
  navigatingRef.current = navigating;
  pinPosRef.current = pin;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let cancelled = false;
    let map: LeafletMap | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !el) return;

      map = L.map(el, {
        zoomControl: true,
        attributionControl: true,
        minZoom: 6,
        maxZoom: 17
      }).setView([pin.lat, pin.lng], 14);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        className: "atlas-tiles",
        maxZoom: 19
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: "",
        html: '<span class="pin-marker" title="Start, drag to move"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      const marker = L.marker([pin.lat, pin.lng], {
        icon: pinIcon,
        draggable: true,
        zIndexOffset: 800,
        title: "Start, drag to move"
      }).addTo(map);
      marker.bindTooltip("Start, drag to move", { direction: "top", offset: [0, -10] });
      marker.on("dragend", () => {
        if (navigatingRef.current) {
          marker.setLatLng([pinPosRef.current.lat, pinPosRef.current.lng]);
          return;
        }
        const ll = marker.getLatLng();
        onPinRef.current({ lat: ll.lat, lng: ll.lng });
      });
      pinRef.current = marker;

      const youIcon = L.divIcon({
        className: "",
        html: '<span class="you-marker" title="You"></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      const youMarker = L.marker([pin.lat, pin.lng], {
        icon: youIcon,
        zIndexOffset: 900,
        title: "You"
      });
      youRef.current = youMarker;

      map.on("click", (event) => {
        if (navigatingRef.current) return;
        onPinRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
      });

      mapRef.current = map;
      setReady(true);
      requestAnimationFrame(() => {
        map?.invalidateSize({ animate: false });
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      pinRef.current = null;
      youRef.current = null;
      hullRef.current = null;
      routeCasingRef.current = null;
      routeLineRef.current = null;
      dotsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = root.current;
    const map = mapRef.current;
    if (!el || !map || !ready) return;
    const sync = () => map.invalidateSize({ animate: false });
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    window.addEventListener("orientationchange", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", sync);
    };
  }, [ready]);

  useEffect(() => {
    const marker = pinRef.current;
    if (!marker || !ready) return;
    marker.dragging?.[navigating ? "disable" : "enable"]?.();
    marker.setLatLng([pin.lat, pin.lng]);
  }, [pin, ready, navigating]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = youRef.current;
    if (!map || !marker || !ready) return;
    if (!you || !navigating) {
      marker.remove();
      return;
    }
    marker.setLatLng([you.lat, you.lng]);
    if (!map.hasLayer(marker)) marker.addTo(map);
    map.panTo([you.lat, you.lng], { animate: true, duration: 0.25 });
  }, [you, navigating, ready]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = mapRef.current;
      if (!map || !ready) return;
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      hullRef.current?.remove();
      hullRef.current = null;
      if (!showHull || hull.length < 3) {
        if (!hasRoute) {
          map.panTo([pin.lat, pin.lng], { animate: true, duration: 0.35 });
        }
        return;
      }
      const poly = L.polygon(
        hull.map((p) => [p.lat, p.lng] as [number, number]),
        {
          color: COLOR.ink,
          weight: 1.5,
          fillColor: COLOR.overlay,
          fillOpacity: 0.34
        }
      ).addTo(map);
      hullRef.current = poly;
      if (!hasRoute) {
        map.fitBounds(poly.getBounds().pad(0.16), { animate: true, maxZoom: 15 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hull, ready, showHull, hasRoute, pin.lat, pin.lng]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = mapRef.current;
      if (!map || !ready) return;
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      if (!routePath || routePath.length < 2) {
        routeCasingRef.current?.remove();
        routeLineRef.current?.remove();
        routeCasingRef.current = null;
        routeLineRef.current = null;
        return;
      }
      const latlngs = routePath.map((p) => [p.lat, p.lng] as [number, number]);
      if (routeCasingRef.current && routeLineRef.current) {
        routeCasingRef.current.setLatLngs(latlngs);
        routeLineRef.current.setLatLngs(latlngs);
        return;
      }
      routeCasingRef.current = L.polyline(latlngs, {
        color: COLOR.ink,
        weight: 8,
        opacity: 1,
        lineJoin: "round",
        lineCap: "round"
      }).addTo(map);
      routeLineRef.current = L.polyline(latlngs, {
        color: COLOR.overlay,
        weight: 5,
        opacity: 1,
        lineJoin: "round",
        lineCap: "round"
      }).addTo(map);
      if (!navigating) {
        map.fitBounds(routeLineRef.current.getBounds().pad(0.2), {
          animate: true,
          maxZoom: 16
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routePath, ready, navigating]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = mapRef.current;
      if (!map || !ready) return;
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      for (const marker of dotsRef.current.values()) marker.remove();
      dotsRef.current.clear();
      for (const row of reachable) {
        const on = row.poi.id === selectedId;
        const label = `${row.poi.name} · ${row.journey.roundTripMinutes} min there and back`;
        const wide = row.poi.category === "pharmacy";
        const size = wide ? (on ? 32 : 28) : on ? 26 : 22;
        const mark = L.marker([row.poi.lat, row.poi.lng], {
          icon: L.divIcon({
            className: "",
            html: poiMarkHtml(row.poi.category, on, label),
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
          }),
          zIndexOffset: on ? 400 : 200,
          title: label
        }).addTo(map);
        mark.bindTooltip(label, { direction: "top", offset: [0, -12], opacity: 0.95 });
        mark.on("click", (event) => {
          L.DomEvent.stopPropagation(event);
          onSelectRef.current(row.poi.id);
        });
        dotsRef.current.set(row.poi.id, mark);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reachable, selectedId, ready]);

  return <div ref={root} className="map-canvas" role="application" aria-label="Regional Victoria map" />;
}
