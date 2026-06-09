"use client";

import { useState } from "react";
import { Building2, Layers, Search } from "lucide-react";
import { AidMap } from "@/components/map/aid-map";
import { HospitalDetail } from "@/components/map/hospital-detail";
import { HospitalMarker } from "@/components/map/hospital-marker";
import { RoleSwitchCards } from "@/components/shell/role-switch-cards";
import { useRole } from "@/components/providers/role-provider";
import { getCaseMarkers, getHospitals, occupancyBand } from "@/lib/data";
import { roleLabel } from "@/lib/ui";
import type { Hospital } from "@/types";
import { cn } from "@/lib/utils";

function Check({
  label,
  checked,
  onChange,
  dot,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  dot?: string;
}) {
  return (
    <button onClick={onChange} className="flex w-full items-center gap-2.5 py-1.5 text-left text-sm">
      <span className={cn("flex size-4 items-center justify-center rounded border", checked ? "border-info bg-info" : "border-border")}>
        {checked && <span className="size-1.5 rounded-sm bg-white" />}
      </span>
      {dot && <span className={cn("size-2 rounded-full", dot)} />}
      {label}
    </button>
  );
}

export default function MapPage() {
  const { role } = useRole();
  const cases = getCaseMarkers();
  const hospitals = getHospitals();

  const [showCases, setShowCases] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [caseTypes, setCaseTypes] = useState({ dengue: true, covid: true, flu: true });
  const [bands, setBands] = useState({ high: true, medium: true, low: true });
  const [selected, setSelected] = useState<Hospital | null>(null);

  const [query, setQuery] = useState("");
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [flyNonce, setFlyNonce] = useState(0);

  const fly = (lat: number, lng: number) => {
    setFlyTarget([lat, lng]);
    setFlyNonce((n) => n + 1);
  };

  // Filtered layers
  const shownCases = showCases
    ? cases.filter((c) =>
        c.type === "dengue" ? caseTypes.dengue
          : c.type === "covid" ? caseTypes.covid
            : c.type === "flu" ? caseTypes.flu
              : true,
      )
    : [];

  let shownHospitals = showHospitals
    ? hospitals.filter((h) => bands[occupancyBand(h.occupancy)])
    : [];
  if (selected && !shownHospitals.some((h) => h.id === selected.id)) {
    shownHospitals = [...shownHospitals, selected];
  }

  // Search index (hospitals + case areas)
  const matches = query.trim()
    ? [
        ...hospitals.map((h) => ({ kind: "hospital" as const, label: h.name, h })),
        ...cases.map((c) => ({ kind: "area" as const, label: c.area, c })),
      ].filter((m) => m.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];

  const pickHospital = (h: Hospital) => {
    setSelected(h);
    setShowHospitals(true);
    fly(h.lat, h.lng);
    setQuery("");
  };

  const runSearch = () => {
    const m = matches[0];
    if (!m) return;
    if (m.kind === "hospital") pickHospital(m.h);
    else { setSelected(null); fly(m.c.lat, m.c.lng); setQuery(""); }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <form
          onSubmit={(e) => { e.preventDefault(); runSearch(); }}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5"
        >
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a location or hospital…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </form>
        {matches.length > 0 && (
          <ul className="absolute z-[500] mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-2xl">
            {matches.map((m, i) => (
              <li key={i}>
                <button
                  onClick={() => (m.kind === "hospital" ? pickHospital(m.h) : (setSelected(null), fly(m.c.lat, m.c.lng), setQuery("")))}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  {m.kind === "hospital" ? <Building2 className="size-4 text-info" /> : <Search className="size-4 text-muted-foreground" />}
                  {m.label}
                  <span className="ml-auto text-xs text-muted-foreground">{m.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid h-[70vh] grid-cols-[280px_1fr_340px] gap-4 max-lg:h-auto max-lg:grid-cols-1">
        {/* Filters */}
        <aside className="surface flex flex-col gap-5 overflow-y-auto p-5 no-scrollbar">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">View</p>
            <p className="mt-1 text-sm">{roleLabel[role]} map</p>
          </div>

          <div>
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><Layers className="size-4" /> Map Layers</p>
            <Check label="Active Cases" checked={showCases} onChange={() => setShowCases((v) => !v)} />
            <Check label="Hospital Beds" checked={showHospitals} onChange={() => setShowHospitals((v) => !v)} />
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold">Case Types</p>
            <Check label="Dengue" checked={caseTypes.dengue} dot="bg-danger" onChange={() => setCaseTypes((s) => ({ ...s, dengue: !s.dengue }))} />
            <Check label="COVID-19" checked={caseTypes.covid} dot="bg-info" onChange={() => setCaseTypes((s) => ({ ...s, covid: !s.covid }))} />
            <Check label="Influenza" checked={caseTypes.flu} dot="bg-warning" onChange={() => setCaseTypes((s) => ({ ...s, flu: !s.flu }))} />
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold">Hospital Occupancy</p>
            <Check label="High (> 80%)" checked={bands.high} dot="bg-danger" onChange={() => setBands((s) => ({ ...s, high: !s.high }))} />
            <Check label="Medium (50–80%)" checked={bands.medium} dot="bg-warning" onChange={() => setBands((s) => ({ ...s, medium: !s.medium }))} />
            <Check label="Low (< 50%)" checked={bands.low} dot="bg-success" onChange={() => setBands((s) => ({ ...s, low: !s.low }))} />
          </div>
        </aside>

        {/* Map */}
        <div className="surface overflow-hidden p-0 max-lg:h-[55vh]">
          <AidMap
            cases={shownCases}
            hospitals={shownHospitals}
            selectedId={selected?.id ?? null}
            onSelectHospital={setSelected}
            flyTarget={flyTarget}
            flyNonce={flyNonce}
          />
        </div>

        {/* Right: detail or list */}
        <aside className="flex min-h-0 flex-col overflow-hidden">
          {selected ? (
            <HospitalDetail hospital={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="surface flex min-h-0 flex-col p-5">
              <p className="flex items-center gap-2 font-semibold"><Building2 className="size-4" /> Hospitals</p>
              <ul className="mt-3 space-y-2 overflow-y-auto no-scrollbar">
                {shownHospitals.map((h) => (
                  <li key={h.id}>
                    <button
                      onClick={() => pickHospital(h)}
                      className="surface-muted flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-info/50"
                    >
                      <HospitalMarker name={h.name} occupancy={h.occupancy} scale={0.55} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{h.name}</span>
                        <span className="block text-xs text-muted-foreground">{h.available} beds available</span>
                      </span>
                    </button>
                  </li>
                ))}
                {shownHospitals.length === 0 && (
                  <li className="py-6 text-center text-sm text-muted-foreground">No hospitals match the filters.</li>
                )}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* Role cards at the bottom */}
      <RoleSwitchCards />
    </div>
  );
}
