"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, Polygon } from "leaflet";
import type { Isochrone } from "@/lib/reach";
import { COLOR } from "@/lib/palette";
import type { LatLng, ReachablePoi } from "@/lib/types";

type Props = {
  pin: LatLng;
  hull: Isochrone;
  reachable: ReachablePoi[];
  selectedId: string | null;
  onPin: (pt: LatLng) => void;
  onSelect: (id: string) => void;
};

function squareHtml(on: boolean) {
  return `<span class="poi-mark${on ? " is-on" : ""}"></span>`;
}

export default function ReachMap({
  pin,
  hull,
  reachable,
  selectedId,
  onPin,
  onSelect
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const pinRef = useRef<Marker | null>(null);
  const hullRef = useRef<Polygon | null>(null);
  const dotsRef = useRef<Map<string, Marker>>(new Map());
  const onPinRef = useRef(onPin);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  onPinRef.current = onPin;
  onSelectRef.current = onSelect;

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
        minZoom: 10,
        maxZoom: 17
      }).setView([pin.lat, pin.lng], 14);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        className: "atlas-tiles"
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: "",
        html: '<span class="pin-marker"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([pin.lat, pin.lng], {
        icon: pinIcon,
        draggable: true,
        zIndexOffset: 800
      }).addTo(map);
      marker.on("dragend", () => {
        const ll = marker.getLatLng();
        onPinRef.current({ lat: ll.lat, lng: ll.lng });
      });
      pinRef.current = marker;

      map.on("click", (event) => {
        onPinRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
      });

      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      pinRef.current = null;
      hullRef.current = null;
      dotsRef.current.clear();
    };
    // Map instance is created once; later pin moves go through marker.setLatLng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = pinRef.current;
    if (!map || !marker || !ready) return;
    marker.setLatLng([pin.lat, pin.lng]);
    map.panTo([pin.lat, pin.lng], { animate: true, duration: 0.35 });
  }, [pin, ready]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = mapRef.current;
      if (!map || !ready) return;
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      hullRef.current?.remove();
      hullRef.current = null;
      if (hull.length < 3) return;
      const poly = L.polygon(
        hull.map((p) => [p.lat, p.lng] as [number, number]),
        {
          color: COLOR.ink,
          weight: 1.5,
          fillColor: COLOR.overlay,
          fillOpacity: 1
        }
      ).addTo(map);
      hullRef.current = poly;
    })();
    return () => {
      cancelled = true;
    };
  }, [hull, ready]);

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
        const mark = L.marker([row.poi.lat, row.poi.lng], {
          icon: L.divIcon({
            className: "",
            html: squareHtml(on),
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          }),
          zIndexOffset: on ? 400 : 200
        }).addTo(map);
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

  return <div ref={root} className="map-canvas" role="application" aria-label="Melbourne map" />;
}
