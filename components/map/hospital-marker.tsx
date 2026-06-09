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

/** Reusable liquid-fill teardrop hospital marker (used in the right-side list). */
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
  const boxStyle = { width: 64 * scale, height: 80 * scale, border: "none", background: "transparent", padding: 0 } as const;
  const pin = (
    <div className={cn("hpin", selected && "is-selected")} style={{ transformOrigin: "top left", transform: `scale(${scale})` }}>
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
      <div className="hpin-h">H</div>
      <div className="hpin-pct">{occupancy}%</div>
    </div>
  );

  // When no handler is given the marker is decorative (e.g. inside a list row
  // that is itself a <button>) — render a non-interactive <span> to avoid
  // nesting a <button> inside a <button> (invalid HTML / hydration error).
  if (!onClick) {
    return (
      <span title={name} style={{ ...boxStyle, display: "inline-block" }}>
        {pin}
      </span>
    );
  }

  return (
    <button type="button" onClick={onClick} title={name} style={boxStyle}>
      {pin}
    </button>
  );
}
