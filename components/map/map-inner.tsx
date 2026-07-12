"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
import { SG_LAND_RINGS } from "./sg-land";
import type { ActiveCase, CaseMarker, Hospital, TempFacility } from "@/types";
import { SG_CENTER } from "@/constants";
import { reportTypeColor } from "@/lib/data";

// Temporary facilities render as gold rounded-square badges — visually distinct
// from both the hospital "H" pins and the case dots. Tent = quarantine space,
// cross = treatment clinic.
const tempFacilityHtml = (kind: TempFacility["kind"], selected: boolean) => `
<div style="width:34px;height:34px;border-radius:10px;background:#d4a72c;
  border:2px solid ${selected ? "#ffffff" : "rgba(255,255,255,0.65)"};
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 10px rgba(0,0,0,0.55)${selected ? ",0 0 0 5px rgba(212,167,44,0.35)" : ""}">
  ${
    kind === "treatment"
      ? '<svg width="15" height="15" viewBox="0 0 16 16"><path d="M6 1h4v5h5v4h-5v5H6v-5H1V6h5z" fill="#141414"/></svg>'
      : '<svg width="17" height="17" viewBox="0 0 18 18"><path d="M9 2.5 L16.5 15.5 H11.6 L9 10.8 L6.4 15.5 H1.5 Z" fill="#141414"/></svg>'
  }
</div>`;

// Dots are coloured by case TYPE so the colours match the filter legend
// (Dengue = red, COVID-19 = blue, Influenza = amber).
const TYPE_COLOR: Record<string, string> = {
  dengue: "#ef4444",
  covid: "#3b82f6",
  flu: "#f59e0b",
  heatstroke: "#f97316",
  foodborne: "#22c55e",
  other: "#a855f7",
};

// Deterministic pseudo-random in [0,1) so scattered dots stay put across renders.
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// Stable numeric seed from a string id (independent of array position/filtering).
const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 100000;
};

// Ray-casting point-in-ring. SG_LAND_RINGS coords are [lng, lat].
const inRing = (lat: number, lng: number, ring: [number, number][]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

// On the main island's coastline (ring 0) and not inside any reservoir/water
// hole (rings 1+), so scattered dots never land in the sea or inland water.
const inSingapore = (lat: number, lng: number) => {
  if (!inRing(lat, lng, SG_LAND_RINGS[0])) return false;
  for (let k = 1; k < SG_LAND_RINGS.length; k++) {
    if (inRing(lat, lng, SG_LAND_RINGS[k])) return false;
  }
  return true;
};

/** Tracks the app theme so the tile layer can switch dark/light basemaps. */
function useDarkTheme() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    window.addEventListener("aidpulse:theme-change", sync);
    return () => window.removeEventListener("aidpulse:theme-change", sync);
  }, []);
  return dark;
}

/** Flies the map to a target when the search nonce changes. */
function FlyTo({ target, nonce }: { target: [number, number] | null; nonce: number }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 15, { duration: 1.2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);
  return null;
}

/** Drives zoom from the floating buttons in the page (rendered outside the map's
    isolate context so they can sit above the panels). Bumping the nonce zooms. */
function ZoomBus({ dir, nonce }: { dir: number; nonce: number }) {
  const map = useMap();
  useEffect(() => {
    if (!nonce) return;
    if (dir > 0) map.zoomIn();
    else if (dir < 0) map.zoomOut();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);
  return null;
}

/** Recompute the map size whenever its container resizes (e.g. when the AI
    drawer opens and pushes the layout) so tiles never render at a stale width. */
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export default function MapInner({
  cases,
  hospitals,
  activeCases,
  tempFacilities,
  enabledTypes,
  selectedId,
  selectedCaseId,
  selectedFacilityId,
  onSelectHospital,
  onSelectCase,
  onSelectFacility,
  flyTarget,
  flyNonce,
  zoomDir,
  zoomNonce,
}: {
  cases: CaseMarker[];
  hospitals: Hospital[];
  activeCases: ActiveCase[];
  tempFacilities: TempFacility[];
  enabledTypes: { dengue: boolean; covid: boolean; flu: boolean };
  selectedId: string | null;
  selectedCaseId: string | null;
  selectedFacilityId: string | null;
  onSelectHospital: (h: Hospital) => void;
  onSelectCase: (c: ActiveCase) => void;
  onSelectFacility: (f: TempFacility) => void;
  flyTarget: [number, number] | null;
  flyNonce: number;
  zoomDir: number;
  zoomNonce: number;
}) {
  // Scatter many small dots per area — each dot gets its own type so a cluster
  // is a MIX of colours (a dominant type plus a sprinkle of the others).
  const MIX = ["dengue", "covid", "flu"] as const;
  const caseDots = useMemo(() => {
    const spread = 0.026; // ~2.8 km
    const dots: { id: string; lat: number; lng: number; area: string; type: string }[] = [];
    cases.forEach((c) => {
      const base = hash(c.id); // seed by the case's own id, not its list index
      const count = Math.max(6, Math.min(Math.round(c.cases / 7), 55));
      for (let k = 0; k < count; k++) {
        const angle = rand(base + k) * Math.PI * 2;
        const r = Math.sqrt(rand(base + k + 0.37)) * spread;
        // ~55% the area's main type, otherwise a random type from the mix pool.
        const type = rand(base + k + 0.11) < 0.55 ? c.type : MIX[Math.floor(rand(base + k + 0.71) * MIX.length)];
        // Pull the dot inward along its own ray until it sits on land — the case
        // centre is a real urban point, so it's always inside the polygon.
        let lat = c.lat;
        let lng = c.lng;
        for (let rr = r; rr > 0.0005; rr *= 0.7) {
          const tryLat = c.lat + rr * Math.cos(angle);
          const tryLng = c.lng + rr * Math.sin(angle);
          if (inSingapore(tryLat, tryLng)) {
            lat = tryLat;
            lng = tryLng;
            break;
          }
        }
        dots.push({ id: `${c.id}-${k}`, lat, lng, area: c.area, type });
      }
    });
    return dots;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases]);

  // Type filtering happens per-dot (so positions never shift when toggling).
  const isEnabled = (type: string) =>
    type === "dengue" ? enabledTypes.dengue
      : type === "covid" ? enabledTypes.covid
        : type === "flu" ? enabledTypes.flu
          : true;
  const visibleDots = caseDots.filter((d) => isEnabled(d.type));

  // Individual reported cases — the clickable dots (larger + brighter than the
  // ambient scatter, with a glowing ring when selected).
  const visibleCases = activeCases.filter((c) => isEnabled(c.caseType));

  // Basemap follows the app theme (CARTO ships matching dark/light tile sets).
  const darkTheme = useDarkTheme();

  return (
    <MapContainer
      center={SG_CENTER}
      zoom={12}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        key={darkTheme ? "dark" : "light"}
        url={`https://{s}.basemaps.cartocdn.com/${darkTheme ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png`}
        attribution="&copy; OpenStreetMap &copy; CARTO"
      />
      <ZoomBus dir={zoomDir} nonce={zoomNonce} />
      <FlyTo target={flyTarget} nonce={flyNonce} />
      <InvalidateOnResize />

      {/* Ambient density scatter (not clickable — gives the "many dots" spread). */}
      {visibleDots.map((d) => (
        <CircleMarker
          key={d.id}
          center={[d.lat, d.lng]}
          radius={3}
          pathOptions={{ stroke: false, fillColor: TYPE_COLOR[d.type] ?? TYPE_COLOR.other, fillOpacity: 0.55 }}
        >
          <Tooltip direction="top">{d.area} · {d.type}</Tooltip>
        </CircleMarker>
      ))}

      {/* Reported cases — clickable dots that drive the Case Details panel. */}
      {visibleCases.map((c) => {
        // Citizen reports are coloured by their report type; legacy/seed cases
        // fall back to the disease-type palette.
        const color = (c.reportType && reportTypeColor[c.reportType]) ?? TYPE_COLOR[c.caseType] ?? TYPE_COLOR.other;
        const selected = selectedCaseId === c.id;
        return (
          <Fragment key={c.id}>
            {selected && (
              <CircleMarker
                center={[c.lat, c.lng]}
                radius={15}
                interactive={false}
                pathOptions={{ stroke: true, color, weight: 2, opacity: 0.7, fillColor: color, fillOpacity: 0.18 }}
              />
            )}
            <CircleMarker
              center={[c.lat, c.lng]}
              radius={selected ? 9 : 7}
              eventHandlers={{ click: () => onSelectCase(c) }}
              pathOptions={{
                stroke: true,
                color: "#ffffff",
                weight: selected ? 2.5 : 1.5,
                fillColor: color,
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top">{c.locationName}</Tooltip>
            </CircleMarker>
          </Fragment>
        );
      })}

      {/* Temporary emergency facilities — campus quarantine/treatment sites. */}
      {tempFacilities.map((f) => {
        const icon = L.divIcon({
          html: tempFacilityHtml(f.kind, selectedFacilityId === f.id),
          className: "hm-divicon",
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        return (
          <Marker
            key={f.id}
            position={[f.lat, f.lng]}
            icon={icon}
            eventHandlers={{ click: () => onSelectFacility(f) }}
          >
            <Tooltip direction="top">{f.name}</Tooltip>
          </Marker>
        );
      })}

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
