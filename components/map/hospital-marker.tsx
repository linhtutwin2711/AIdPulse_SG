import { useId } from "react";
import { cn } from "@/lib/utils";

/** Liquid-fill colour by occupancy: <50 green, 50–80 orange, >80 red. */
export function hospitalFillColor(occupancy: number) {
  return occupancy > 80 ? "#ef4444" : occupancy >= 50 ? "#f59e0b" : "#22c55e";
}

// Teardrop pin path (viewBox 0 0 64 80) — bulb on top, point at the bottom tip.
const PIN = "M32 78 C14 50 6 42 6 26 A26 26 0 1 1 58 26 C58 42 50 50 32 78 Z";
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Marker HTML used inside a Leaflet divIcon (Leaflet can't render React nodes). */
export function hospitalMarkerHtml(occupancy: number, selected: boolean, uid: string) {
  const color = hospitalFillColor(occupancy);
  const top = 80 - (occupancy / 100) * 80; // liquid rises from the bottom
  const clip = `pin-m-${uid}`;
  return `
  <div class="hpin${selected ? " is-selected" : ""}">
    <svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="${clip}"><path d="${PIN}"/></clipPath></defs>
      <g clip-path="url(#${clip})">
        <rect x="0" y="0" width="64" height="80" fill="#14161d"/>
        <rect x="0" y="${top}" width="64" height="${80 - top}" fill="${color}" opacity="0.85"/>
      </g>
      <path d="${PIN}" fill="none" stroke="${color}" stroke-width="3"/>
    </svg>
    <div class="hpin-h">H</div>
    <div class="hpin-pct">${occupancy}%</div>
  </div>`;
}

/**
 * Mini teardrop hospital marker for list rows — same liquid-fill "H" pin used
 * on the map, just smaller. Colour follows occupancy (green/orange/red).
 */
export function MiniHospitalIcon({
  occupancy,
  selected,
  size = 30,
}: {
  occupancy: number;
  selected?: boolean;
  size?: number;
}) {
  const id = useId();
  const clip = `mini-${id}`;
  const color = hospitalFillColor(occupancy);
  const top = 80 - (occupancy / 100) * 80; // liquid rises from the bottom
  const w = size;
  const h = (size * 80) / 64; // keep the 64×80 pin aspect ratio

  return (
    <span
      className={cn("relative inline-block shrink-0", selected && "drop-shadow-[0_0_4px_#3b82f6]")}
      style={{ width: w, height: h }}
    >
      <svg viewBox="0 0 64 80" width={w} height={h} xmlns="http://www.w3.org/2000/svg" className="block">
        <defs>
          <clipPath id={clip}>
            <path d={PIN} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <rect x="0" y="0" width="64" height="80" fill="#14161d" />
          <rect x="0" y={top} width="64" height={80 - top} fill={color} opacity="0.85" />
        </g>
        <path d={PIN} fill="none" stroke={color} strokeWidth="4" />
      </svg>
      <span
        className="absolute left-1/2 -translate-x-1/2 font-extrabold leading-none text-white"
        style={{ top: h * 0.16, fontSize: w * 0.42 }}
      >
        H
      </span>
    </span>
  );
}

/** Compact circular liquid-fill badge — for lists/rows (no teardrop tail). */
export function HospitalBadge({
  occupancy,
  selected,
}: {
  occupancy: number;
  selected?: boolean;
}) {
  const color = hospitalFillColor(occupancy);
  return (
    <span className={cn("hbadge", selected && "hbadge-selected")} style={{ borderColor: color }}>
      <span className="hbadge-fill" style={{ height: `${occupancy}%`, background: color }} />
      <span className="hbadge-h">H</span>
    </span>
  );
}

/** Reusable liquid-fill teardrop hospital marker (used on the map / standalone). */
export function HospitalMarker({
  name,
  occupancy,
  selected,
  onClick,
  scale = 1,
}: {
  name: string;
  occupancy: number;
  selected?: boolean;
  onClick?: () => void;
  scale?: number;
}) {
  const color = hospitalFillColor(occupancy);
  const top = 80 - (occupancy / 100) * 80;
  const clip = `pin-r-${slug(name)}`;
  // Rendered as a <span> (not a <button>) so it can be safely nested inside
  // interactive parents (e.g. the hospital-list row button).
  return (
    <span
      onClick={onClick}
      title={name}
      style={{ display: "inline-block", width: 64 * scale, height: 80 * scale, cursor: onClick ? "pointer" : undefined }}
    >
      <span className={cn("hpin", selected && "is-selected")} style={{ transformOrigin: "top left", transform: `scale(${scale})` }}>
        <svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id={clip}>
              <path d={PIN} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clip})`}>
            <rect x="0" y="0" width="64" height="80" fill="#14161d" />
            <rect x="0" y={top} width="64" height={80 - top} fill={color} opacity="0.85" />
          </g>
          <path d={PIN} fill="none" stroke={color} strokeWidth="3" />
        </svg>
        <span className="hpin-h">H</span>
        <span className="hpin-pct">{occupancy}%</span>
      </span>
    </span>
  );
}
