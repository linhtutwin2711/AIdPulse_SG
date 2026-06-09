"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  Building2,
  Camera,
  CheckCircle2,
  Crosshair,
  ImagePlus,
  Loader2,
  Lock,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { useRole } from "@/components/providers/role-provider";
import { useCases } from "@/components/providers/cases-provider";
import { Button } from "@/components/ui/button";
import { getReportTypes } from "@/lib/data";
import { roleLabel } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { countries, defaultCountry } from "@/constants";
import type { CaseType, ReportTypeId, RiskLevel } from "@/types";

// Maps a report type to the case it creates on the map (colour + label + risk).
const CASE_OF: Record<ReportTypeId, { caseType: CaseType; title: string; risk: RiskLevel }> = {
  symptom: { caseType: "flu", title: "Influenza Report", risk: "medium" },
  exposure: { caseType: "covid", title: "COVID-19 Report", risk: "medium" },
  positive: { caseType: "covid", title: "COVID-19 Report", risk: "high" },
  crowded: { caseType: "covid", title: "COVID-19 Report", risk: "low" },
  disaster: { caseType: "other", title: "Natural Disaster Report", risk: "high" },
  other: { caseType: "other", title: "Community Report", risk: "low" },
};

// A fitting icon per report type (Natural Disaster = warning triangle).
const TYPE_ICON: Record<ReportTypeId, typeof Stethoscope> = {
  symptom: Thermometer,
  exposure: Users,
  positive: Activity,
  crowded: Building2,
  disaster: TriangleAlert,
  other: AlertCircle,
};

const DISASTER_OPTIONS = [
  "Flood",
  "Fire",
  "Haze",
  "Heavy Rain",
  "Fallen Tree",
  "Building Damage",
  "Other Disaster",
];

// How long each report type stays live on the map (days).
const EXPIRY_DAYS: Record<ReportTypeId, number> = {
  symptom: 7,
  exposure: 7,
  positive: 7,
  crowded: 1,
  disaster: 3,
  other: 3,
};

const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

// Forward-geocode a typed location to coordinates (Singapore-scoped). Returns
// null when offline/blocked or no match — the caller then asks for a location.
async function geocode(q: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=sg&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { Accept: "application/json" } }
    );
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    /* offline / blocked */
  }
  return null;
}

const REMINDERS = [
  { icon: ShieldCheck, title: "Be Accurate", desc: "Provide accurate information to help us respond effectively." },
  { icon: Lock, title: "Stay Private", desc: "Your reports are kept confidential and safe." },
  { icon: AlertCircle, title: "Help Cut Rumors", desc: "Your report can help prevent the spread and save lives." },
];

type Photo = { url: string; file: File };
type LocStatus = { kind: "ok" | "err"; msg: string } | null;

const SG_PHONE = /^[89]\d{7}$/; // SG mobile: 8 digits, starts with 8 or 9
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ReportPage() {
  const { role } = useRole();
  const router = useRouter();
  const { addCase } = useCases();
  const types = getReportTypes();

  const [selected, setSelected] = useState<ReportTypeId | null>(null);
  const [disasterType, setDisasterType] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locStatus, setLocStatus] = useState<LocStatus>(null);
  const [details, setDetails] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [phoneIso, setPhoneIso] = useState(defaultCountry.iso);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const country = countries.find((c) => c.iso === phoneIso) ?? defaultCountry;

  // Browser geolocation → reverse-geocode to a readable address (falls back to
  // the raw "lat, lng" if the lookup fails or is offline).
  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocStatus({ kind: "err", msg: "Geolocation is not supported on this device." });
      return;
    }
    setLocating(true);
    setLocStatus(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        let label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { Accept: "application/json" } }
          );
          const data = await res.json();
          if (data?.display_name) label = data.display_name as string;
        } catch {
          /* offline / blocked — keep the lat,lng label */
        }
        setLocation(label);
        setLocating(false);
        setLocStatus({ kind: "ok", msg: "Location detected successfully." });
      },
      () => {
        setLocating(false);
        setLocStatus({ kind: "err", msg: "Location permission denied. Please enter your location manually." });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const next: Photo[] = [];
    for (const file of Array.from(files)) {
      if (photos.length + next.length >= MAX_PHOTOS) {
        setError(`You can upload up to ${MAX_PHOTOS} photos.`);
        break;
      }
      if (!ACCEPTED.includes(file.type)) {
        setError("Only JPG, PNG or WEBP images are allowed.");
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError("Each photo must be 5 MB or smaller.");
        continue;
      }
      next.push({ url: URL.createObjectURL(file), file });
    }
    if (next.length) setPhotos((p) => [...p, ...next]);
  };

  const removePhoto = (i: number) => {
    setPhotos((p) => {
      const target = p[i];
      if (target) URL.revokeObjectURL(target.url);
      return p.filter((_, j) => j !== i);
    });
  };

  const submit = async () => {
    if (!selected) return setError("Please select a report type.");
    if (selected === "disaster" && !disasterType) return setError("Please choose the type of disaster.");
    if (!location.trim()) return setError("Please enter a location or use “Use My Location”.");
    if (!details.trim()) return setError("Please describe what you're reporting.");

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits && country.dial === "+65" && !SG_PHONE.test(phoneDigits)) {
      return setError("Enter a valid Singapore mobile number (8 digits starting with 8 or 9).");
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      return setError("Please enter a valid email address.");
    }

    setError(null);
    setSubmitting(true);

    // A case needs real coordinates to drop a dot. Use the detected location, or
    // forward-geocode whatever the user typed.
    let point = coords;
    if (!point) point = await geocode(location.trim());
    if (!point) {
      setSubmitting(false);
      return setError("Please use your location or select a valid location on the map.");
    }

    const map = CASE_OF[selected];
    const expiresAt = new Date(Date.now() + EXPIRY_DAYS[selected] * 24 * 60 * 60 * 1000).toISOString();
    const created = addCase({
      caseType: map.caseType,
      reportType: selected,
      title: selected === "disaster" && disasterType ? `${disasterType} Report` : map.title,
      locationName: location.trim(),
      description: details.trim(),
      imageUrls: photos.map((p) => p.url),
      riskLevel: map.risk,
      lat: point.lat,
      lng: point.lng,
      disasterType: selected === "disaster" ? disasterType : undefined,
      contactPhone: phoneDigits ? `${country.dial} ${phone.trim()}` : undefined,
      contactEmail: email.trim() || undefined,
      expiresAt,
    });

    // Hand off to the map, which reads ?caseId= to auto-select the new dot.
    router.push(`/map?caseId=${created.id}`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <section className="surface p-6">
        <h1 className="text-2xl font-bold">Report to Help Protect Our Community</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {roleLabel[role]} report · helps us take action and keep everyone safe.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="mt-6 space-y-6"
        >
          <div>
            <p className="mb-2 text-sm font-medium">1. Report Type</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {types.map((t) => {
                const Icon = TYPE_ICON[t.id] ?? Stethoscope;
                const active = selected === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setSelected(t.id); setError(null); }}
                    className={cn(
                      "surface-muted p-4 text-left transition-colors",
                      active ? "border-danger bg-danger/5" : "hover:border-border/80"
                    )}
                  >
                    <Icon className={cn("size-5", active ? "text-danger" : "text-muted-foreground")} />
                    <p className="mt-2 font-medium">{t.label}</p>
                  </button>
                );
              })}
            </div>

            {/* Disaster sub-type — only shown for Natural Disaster reports. */}
            {selected === "disaster" && (
              <label className="mt-3 block">
                <span className="text-sm font-medium">Type of Disaster</span>
                <select
                  value={disasterType}
                  onChange={(e) => { setDisasterType(e.target.value); setError(null); }}
                  className="mt-1.5 w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none focus-visible:border-ring"
                >
                  <option value="" className="bg-popover">Select disaster type…</option>
                  {DISASTER_OPTIONS.map((d) => (
                    <option key={d} value={d} className="bg-popover">{d}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">2. Location</p>
            <div className="flex gap-2">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location or select on map"
                className="flex-1 rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
              />
              <Button
                type="button"
                variant="outline"
                onClick={useMyLocation}
                disabled={locating}
                className="h-auto gap-2 px-3 text-info"
              >
                {locating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
                Use My Location
              </Button>
            </div>
            {locStatus && (
              <p className={cn("mt-1.5 flex items-center gap-1.5 text-xs", locStatus.kind === "ok" ? "text-success" : "text-danger")}>
                {locStatus.kind === "ok" ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                {locStatus.msg}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">3. Details</p>
            <textarea
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please provide more details (what happened, when it started, etc.)"
              className="w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">4. Add Photos (Optional)</p>
            <input
              ref={uploadRef}
              type="file"
              accept={ACCEPTED.join(",")}
              multiple
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />

            {photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((p, i) => (
                  <div key={p.url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="Upload preview" className="aspect-square w-full rounded-lg border border-border object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
                      aria-label="Remove photo"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => uploadRef.current?.click()}
                    className="surface-muted grid aspect-square place-items-center text-muted-foreground hover:text-foreground"
                    aria-label="Add another photo"
                  >
                    <ImagePlus className="size-5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => uploadRef.current?.click()}
                  className="surface-muted grid h-24 w-full place-items-center text-sm text-muted-foreground hover:text-foreground"
                >
                  <span className="flex flex-col items-center gap-1">
                    <ImagePlus className="size-5" /> Upload from device
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="surface-muted grid h-24 w-full place-items-center text-sm text-muted-foreground hover:text-foreground"
                >
                  <span className="flex flex-col items-center gap-1">
                    <Camera className="size-5" /> Take a photo
                  </span>
                </button>
              </div>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG or WEBP · up to {MAX_PHOTOS} photos · 5 MB each.</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">5. Contact Information (Optional)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-muted-foreground">Phone number</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-input bg-input/30 pr-3">
                  <select
                    value={phoneIso}
                    onChange={(e) => setPhoneIso(e.target.value)}
                    className="rounded-l-xl border-r border-border bg-transparent py-2.5 pl-3 pr-2 text-sm outline-none"
                  >
                    {countries.map((c) => (
                      <option key={c.iso} value={c.iso} className="bg-popover">{c.flag} {c.dial}</option>
                    ))}
                  </select>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    placeholder="9123 4567"
                    className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
                />
              </label>
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
              <AlertCircle className="size-4 shrink-0" /> {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={!selected || submitting} className="h-12 w-full text-base">
            {submitting ? <><Loader2 className="size-4 animate-spin" /> Submitting…</> : "Submit Report"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            All reports are confidential and used for public health purposes only.
          </p>
        </form>
      </section>

      <aside className="space-y-6">
        <div className="surface p-5">
          <h3 className="font-semibold">What to Report</h3>
          <ul className="mt-3 space-y-3">
            {types.map((t) => {
              const Icon = TYPE_ICON[t.id] ?? Stethoscope;
              return (
                <li key={t.id} className="flex gap-3">
                  <Icon className="mt-0.5 size-4 shrink-0 text-danger" />
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="surface p-5">
          <h3 className="font-semibold">Important Reminders</h3>
          <ul className="mt-3 space-y-3">
            {REMINDERS.map((r) => (
              <li key={r.title} className="flex gap-3">
                <r.icon className="mt-0.5 size-4 shrink-0 text-info" />
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
