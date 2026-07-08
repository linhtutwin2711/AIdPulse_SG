"use client";

import dynamic from "next/dynamic";
import type { ActiveCase, CaseMarker, Hospital, TempFacility } from "@/types";

// Leaflet touches `window` at import time, so the map must never render on the
// server. ssr:false dynamic import is only allowed inside a client component.
const MapInner = dynamic(() => import("./map-inner"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-background text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function AidMap(props: {
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
  return <MapInner {...props} />;
}
