"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Layers, Minus, Plus, Search, SlidersHorizontal, Tent } from "lucide-react";
import { AidMap } from "@/components/map/aid-map";
import { HospitalDetail } from "@/components/map/hospital-detail";
import { CaseDetail } from "@/components/map/case-detail";
import { TempFacilityDetail } from "@/components/map/temp-facility-detail";
import { MiniHospitalIcon } from "@/components/map/hospital-marker";
import { RoleSwitchCards } from "@/components/shell/role-switch-cards";
import { useRole } from "@/components/providers/role-provider";
import { useCases } from "@/components/providers/cases-provider";
import { fetchCaseMarkers, fetchHospitals, getTempFacilities, occupancyBand } from "@/lib/data";
import { roleLabel } from "@/lib/ui";
import type { ActiveCase, CaseMarker, Hospital, TempFacility } from "@/types";
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

// Shared look for the floating glass panels over the map.
const PANEL = "rounded-2xl border border-border bg-card/90 shadow-2xl backdrop-blur-md";

export default function MapPage() {
  const { role } = useRole();
  const router = useRouter();
  const { cases: reportedCases, resolveCase } = useCases();

  // Live case clusters + hospitals from Supabase. Fetched client-side (this is a
  // client component); on error we log and leave the layer empty rather than
  // falling back to stale mock data.
  const [cases, setCases] = useState<CaseMarker[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  useEffect(() => {
    let active = true;
    fetchCaseMarkers()
      .then((d) => active && setCases(d))
      .catch((err) => console.error("MapPage fetchCaseMarkers failed:", err));
    fetchHospitals()
      .then((d) => active && setHospitals(d))
      .catch((err) => console.error("MapPage fetchHospitals failed:", err));
    return () => {
      active = false;
    };
  }, []);

  const [showCases, setShowCases] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showTemp, setShowTemp] = useState(true);
  const [caseTypes, setCaseTypes] = useState({ dengue: true, covid: true, flu: true });
  const [bands, setBands] = useState({ high: true, medium: true, low: true });
  const [selected, setSelected] = useState<Hospital | null>(null);
  const [selectedCase, setSelectedCase] = useState<ActiveCase | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<TempFacility | null>(null);

  // Temporary emergency facilities (campus quarantine/treatment sites) — same
  // layer for every role. Like hospitals, a selected facility stays visible
  // even when its layer is toggled off.
  const facilities = getTempFacilities();
  let shownFacilities = showTemp ? facilities : [];
  if (selectedFacility && !shownFacilities.some((f) => f.id === selectedFacility.id)) {
    shownFacilities = [...shownFacilities, selectedFacility];
  }

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [hospitalsOpen, setHospitalsOpen] = useState(true);

  const [query, setQuery] = useState("");
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [flyNonce, setFlyNonce] = useState(0);

  const [zoom, setZoom] = useState({ dir: 0, nonce: 0 });
  const doZoom = (dir: 1 | -1) => setZoom((z) => ({ dir, nonce: z.nonce + 1 }));

  const fly = (lat: number, lng: number) => {
    setFlyTarget([lat, lng]);
    setFlyNonce((n) => n + 1);
  };

  // Coming from a fresh report: ?caseId= auto-selects the new dot and opens its
  // details panel once the case is present (it arrives after provider hydration).
  const autoSelected = useRef(false);
  useEffect(() => {
    if (autoSelected.current) return;
    const id = new URLSearchParams(window.location.search).get("caseId");
    if (!id) return;
    const c = reportedCases.find((x) => x.id === id);
    if (!c) return;
    autoSelected.current = true;
    setSelectedCase(c);
    setSelected(null);
    fly(c.lat, c.lng);
    // Drop the param so a refresh doesn't re-trigger the selection.
    window.history.replaceState(null, "", "/map");
  }, [reportedCases]);

  // The Active Cases layer toggles all dots; per-type filtering happens at the
  // dot level inside the map (so mixed clusters stay put when toggling types).
  const shownCases = showCases ? cases : [];
  const shownActiveCases = showCases
    ? reportedCases.filter(
        (c) => c.status === "active" && (!c.expiresAt || new Date(c.expiresAt).getTime() > Date.now())
      )
    : [];

  let shownHospitals = showHospitals
    ? hospitals.filter((h) => bands[occupancyBand(h.occupancy)])
    : [];
  if (selected && !shownHospitals.some((h) => h.id === selected.id)) {
    shownHospitals = [...shownHospitals, selected];
  }

  // Search index (hospitals + case areas + temporary facilities)
  const matches = query.trim()
    ? [
        ...hospitals.map((h) => ({ kind: "hospital" as const, label: h.name, h })),
        ...cases.map((c) => ({ kind: "area" as const, label: c.area, c })),
        ...facilities.map((f) => ({ kind: "facility" as const, label: f.name, f })),
      ].filter((m) => m.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];

  const pickHospital = (h: Hospital) => {
    setSelected(h);
    setSelectedCase(null);
    setSelectedFacility(null);
    setShowHospitals(true);
    fly(h.lat, h.lng);
    setQuery("");
  };

  // Selecting a reported case swaps the right panel to its details.
  const pickCase = (c: ActiveCase) => {
    setSelectedCase(c);
    setSelected(null);
    setSelectedFacility(null);
    fly(c.lat, c.lng);
    setQuery("");
  };

  const pickFacility = (f: TempFacility) => {
    setSelectedFacility(f);
    setSelected(null);
    setSelectedCase(null);
    setShowTemp(true);
    fly(f.lat, f.lng);
    setQuery("");
  };

  const onResolveCase = (id: string) => {
    resolveCase(id); // provider — persists + removes the dot
    setSelectedCase(null);
  };

  const pickArea = (lat: number, lng: number) => {
    setSelected(null);
    setSelectedCase(null);
    setSelectedFacility(null);
    fly(lat, lng);
    setQuery("");
  };

  const runSearch = () => {
    const m = matches[0];
    if (!m) return;
    if (m.kind === "hospital") pickHospital(m.h);
    else if (m.kind === "facility") pickFacility(m.f);
    else pickArea(m.c.lat, m.c.lng);
  };

  return (
    <div className="relative h-full w-full">
      {/* Full-bleed map background */}
      {/* `isolate` traps Leaflet's high internal z-indexes (tiles/markers/controls
          are 400–800) so they never paint over the floating panels or AI drawer. */}
      <div className="absolute inset-0 isolate">
        <AidMap
          cases={shownCases}
          hospitals={shownHospitals}
          activeCases={shownActiveCases}
          tempFacilities={shownFacilities}
          enabledTypes={caseTypes}
          selectedId={selected?.id ?? null}
          selectedCaseId={selectedCase?.id ?? null}
          selectedFacilityId={selectedFacility?.id ?? null}
          onSelectHospital={pickHospital}
          onSelectCase={pickCase}
          onSelectFacility={pickFacility}
          flyTarget={flyTarget}
          flyNonce={flyNonce}
          zoomDir={zoom.dir}
          zoomNonce={zoom.nonce}
        />
      </div>

      {/* A — Left floating panel: search + collapsible filters */}
      <div className="absolute left-3 top-3 z-30 w-[min(80vw,256px)]">
        <div className={cn(PANEL, "p-2.5 text-[13px]")}>
          {/* Search */}
          <div className="relative">
            <form
              onSubmit={(e) => { e.preventDefault(); runSearch(); }}
              className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5"
            >
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search location or hospital…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </form>
            {matches.length > 0 && (
              <ul className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-2xl">
                {matches.map((m, i) => (
                  <li key={i}>
                    <button
                      onClick={() =>
                        m.kind === "hospital" ? pickHospital(m.h)
                        : m.kind === "facility" ? pickFacility(m.f)
                        : pickArea(m.c.lat, m.c.lng)
                      }
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary"
                    >
                      {m.kind === "hospital" ? <Building2 className="size-4 text-info" />
                        : m.kind === "facility" ? <Tent className="size-4 text-gold" />
                        : <Search className="size-4 text-muted-foreground" />}
                      <span className="truncate">{m.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{m.kind}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="mt-2 flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm font-semibold"
          >
            <span className="flex items-center gap-2"><SlidersHorizontal className="size-4" /> Map Filters</span>
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", !filtersOpen && "-rotate-90")} />
          </button>

          {filtersOpen && (
            <div className="mt-1 max-h-[min(54vh,400px)] space-y-3 overflow-y-auto px-1 no-scrollbar">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">View</p>
                <p className="mt-0.5 text-sm">{roleLabel[role]} map</p>
              </div>

              <div>
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><Layers className="size-4" /> Map Layers</p>
                <Check label="Active Cases" checked={showCases} onChange={() => setShowCases((v) => !v)} />
                <Check label="Hospital Beds" checked={showHospitals} onChange={() => setShowHospitals((v) => !v)} />
                <Check label="Temporary Facilities" checked={showTemp} dot="bg-gold" onChange={() => setShowTemp((v) => !v)} />
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
            </div>
          )}
        </div>
      </div>

      {/* B — Right floating panel: hospital list / hospital detail / case detail.
          Desktop: docked right column. Mobile: bottom sheet. */}
      <aside
        className={cn(
          "absolute z-30 flex flex-col justify-end",
          "inset-x-3 bottom-3 top-auto h-[46%]",
          "md:inset-x-auto md:left-auto md:right-3 md:top-3 md:bottom-3 md:h-auto md:w-[340px] md:justify-start",
          // When showing the (collapsible) list, don't let the empty column block
          // the map — only the card itself stays interactive.
          !selected && !selectedCase && !selectedFacility && "pointer-events-none"
        )}
      >
        {selectedCase ? (
          <CaseDetail
            item={selectedCase}
            role={role}
            onClose={() => setSelectedCase(null)}
            onViewNearby={() => fly(selectedCase.lat, selectedCase.lng)}
            onReportUpdate={() => router.push("/report")}
            onResolve={() => onResolveCase(selectedCase.id)}
          />
        ) : selectedFacility ? (
          <TempFacilityDetail facility={selectedFacility} onClose={() => setSelectedFacility(null)} />
        ) : selected ? (
          <HospitalDetail hospital={selected} onClose={() => setSelected(null)} />
        ) : (
          <div className={cn(PANEL, "pointer-events-auto flex max-h-full min-h-0 flex-col p-4")}>
            <button
              onClick={() => setHospitalsOpen((v) => !v)}
              aria-expanded={hospitalsOpen}
              className="flex items-center justify-between font-semibold"
            >
              <span className="flex items-center gap-2"><Building2 className="size-4" /> Hospitals</span>
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", !hospitalsOpen && "-rotate-90")} />
            </button>
            {hospitalsOpen && (
            <ul className="mt-3 flex-1 space-y-2 overflow-y-auto no-scrollbar">
              {shownHospitals.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => pickHospital(h)}
                    className="surface-muted flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-info/50"
                  >
                    <MiniHospitalIcon occupancy={h.occupancy} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{h.name}</span>
                      <span className="block text-xs text-muted-foreground">{h.available} beds available · {h.occupancy}%</span>
                    </span>
                  </button>
                </li>
              ))}
              {shownHospitals.length === 0 && (
                <li className="py-6 text-center text-sm text-muted-foreground">No hospitals match the filters.</li>
              )}
              {shownFacilities.length > 0 && (
                <>
                  <li className="pt-2 text-xs font-semibold uppercase text-muted-foreground">
                    Temporary Facilities
                  </li>
                  {shownFacilities.map((f) => (
                    <li key={f.id}>
                      <button
                        onClick={() => pickFacility(f)}
                        className="surface-muted flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-gold/50"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                          <Tent className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{f.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {f.capacity - f.occupied} spaces available · {f.host}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </>
              )}
            </ul>
            )}
          </div>
        )}
      </aside>

      {/* C — Bottom-left floating role switcher. Collapsed to a single button by
          default; expands into the two role cards on click.
          Hidden below lg, where the bottom sheet owns the bottom of the screen. */}
      <div className="absolute bottom-3 left-3 z-20 hidden lg:block">
        <RoleSwitchCards variant="map" />
      </div>

      {/* D — Floating horizontal zoom controls. Rendered outside the map's
          `isolate` context (so they sit above the panels) and lifted to clear
          the AI launcher button below them (fixed bottom-6 right-6). */}
      <div className={cn(PANEL, "absolute bottom-[5.75rem] right-6 z-30 flex items-center overflow-hidden p-0")}>
        <button
          onClick={() => doZoom(1)}
          aria-label="Zoom in"
          className="flex size-10 items-center justify-center transition-colors hover:bg-secondary"
        >
          <Plus className="size-5" />
        </button>
        <span className="h-6 w-px bg-border" />
        <button
          onClick={() => doZoom(-1)}
          aria-label="Zoom out"
          className="flex size-10 items-center justify-center transition-colors hover:bg-secondary"
        >
          <Minus className="size-5" />
        </button>
      </div>
    </div>
  );
}
