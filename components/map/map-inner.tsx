"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { hospitalMarkerHtml } from "./hospital-marker";
import type { CaseMarker, Hospital } from "@/types";
import { SG_CENTER } from "@/constants";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  moderate: "#3b82f6",
  low: "#22c55e",
};

// Deterministic pseudo-random in [0,1) so scattered dots stay put across renders.
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Flies the map to a target when the search nonce changes. */
function FlyTo({ target, nonce }: { target: [number, number] | null; nonce: number }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 15, { duration: 1.2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);
  return null;
}

export default function MapInner({
  cases,
  hospitals,
  selectedId,
  onSelectHospital,
  flyTarget,
  flyNonce,
}: {
  cases: CaseMarker[];
  hospitals: Hospital[];
  selectedId: string | null;
  onSelectHospital: (h: Hospital) => void;
  flyTarget: [number, number] | null;
  flyNonce: number;
}) {
  // Scatter many small dots per area, density proportional to case count.
  const caseDots = useMemo(() => {
    const spread = 0.014; // ~1.5 km
    const dots: { id: string; lat: number; lng: number; color: string; area: string; type: string }[] = [];
    cases.forEach((c, i) => {
      const count = Math.max(6, Math.min(Math.round(c.cases / 6), 70));
      for (let k = 0; k < count; k++) {
        const angle = rand(i * 131 + k) * Math.PI * 2;
        const r = Math.sqrt(rand(i * 131 + k + 0.37)) * spread;
        dots.push({
          id: `${c.id}-${k}`,
          lat: c.lat + r * Math.cos(angle),
          lng: c.lng + r * Math.sin(angle),
          color: SEVERITY_COLOR[c.severity],
          area: c.area,
          type: c.type,
        });
      }
    });
    return dots;
  }, [cases]);

  return (
    <MapContainer
      center={SG_CENTER}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "#0a0b0e" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap &copy; CARTO"
      />
      <FlyTo target={flyTarget} nonce={flyNonce} />

      {caseDots.map((d) => (
        <CircleMarker
          key={d.id}
          center={[d.lat, d.lng]}
          radius={3.5}
          pathOptions={{ stroke: false, fillColor: d.color, fillOpacity: 0.8 }}
        >
          <Tooltip direction="top">{d.area} · {d.type}</Tooltip>
        </CircleMarker>
      ))}

      {/* Hospitals render as custom liquid-fill "H" markers (no generic pins). */}
      {hospitals.map((h) => {
        const icon = L.divIcon({
          html: hospitalMarkerHtml(h.occupancy, selectedId === h.id, h.id),
          className: "hm-divicon",
          iconSize: [64, 80],
          iconAnchor: [32, 78], // tip points at the location
        });
        return (
          <Marker
            key={h.id}
            position={[h.lat, h.lng]}
            icon={icon}
            eventHandlers={{ click: () => onSelectHospital(h) }}
          >
            <Tooltip direction="top">{h.name}</Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
