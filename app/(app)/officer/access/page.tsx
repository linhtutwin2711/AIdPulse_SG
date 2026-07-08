"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, CheckCircle2, FileCheck2, FileWarning, Loader2, Lock, ScanSearch, Search, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { useProfile } from "@/components/providers/profile-provider";
import { useRole } from "@/components/providers/role-provider";
import { analyzeAuthorization, type AuthorizationAnalysis } from "@/lib/authorization-ai";
import { getHospitals } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = 0 | 1 | 2 | 3;
const STEP_LABELS = ["Authorization", "Verification", "Authenticate"];

/** Bold the part of `text` that matches the lowercased query `q`. */
function highlight(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q);
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-bold text-gold">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function OfficerAccessPage() {
  const router = useRouter();
  const { setRole, setOfficerHospitalId } = useRole();
  const { fullName } = useProfile();
  const hospitals = getHospitals();
  const [step, setStep] = useState<Step>(0);
  const [hospitalId, setHospitalId] = useState(hospitals[0]?.id ?? "");
  const [hospitalQuery, setHospitalQuery] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  // AI scan of the confidential authorization letter — replaces typed
  // credentials. The scan must confirm the document before Continue unlocks.
  const [analysis, setAnalysis] = useState<AuthorizationAnalysis | null>(null);
  const [scanning, setScanning] = useState(false);
  const docInput = useRef<HTMLInputElement>(null);

  // Manual-hospital <details>: state-owned so the user's expand/collapse isn't
  // clobbered by re-renders; auto-opens when a scan can't identify the hospital.
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    if (analysis?.authorized && !analysis.hospitalId) setPickerOpen(true);
  }, [analysis]);

  const onDocument = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setScanning(true);
    setAnalysis(null);
    try {
      const result = await analyzeAuthorization(file, fullName);
      setAnalysis(result);
      // The letter names the hospital — pre-select it for the appointment.
      if (result.hospitalId) setHospitalId(result.hospitalId);
    } finally {
      // Never leave the UI stuck on "scanning", whatever goes wrong.
      setScanning(false);
    }
  };

  const q = hospitalQuery.trim().toLowerCase();
  const filteredHospitals = q
    ? hospitals.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          (h.type ?? "").toLowerCase().includes(q) ||
          (h.address ?? "").toLowerCase().includes(q),
      )
    : hospitals;
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Simulated verification — the officer console is a demo gate, not a real
  // SMS flow. (Real Twilio OTP lives on the citizen sign-up at app/page.tsx.)
  useEffect(() => {
    if (step === 2) {
      const t = setTimeout(() => setStep(3), 1800);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-3 text-2xl font-bold">Emergency Officer Access</h1>
        <p className="text-sm text-muted-foreground">
          Secure, multi-step verification for authorized responders.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span className={cn(
              "flex size-7 items-center justify-center rounded-full text-xs font-semibold",
              i < step || step === 3 ? "bg-gold text-black" : i === step ? "bg-gold/20 text-gold ring-2 ring-gold" : "bg-secondary text-muted-foreground"
            )}>
              {i < step || step === 3 ? <CheckCircle2 className="size-4" /> : i + 1}
            </span>
            <span className={cn("text-sm", i === step ? "font-medium" : "text-muted-foreground")}>{label}</span>
            {i < STEP_LABELS.length - 1 && <span className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      <div className="surface p-6">
        {step === 0 && (
          <form onSubmit={(e) => { e.preventDefault(); if (analysis?.authorized) setStep(1); }} className="space-y-4">
            {/* Upload the confidential authorization letter — the AI reads it. */}
            <div>
              <span className="text-sm font-medium">Authorization Document</span>
              <input
                ref={docInput}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => onDocument(e.target.files)}
                className="hidden"
                aria-label="Upload authorization document"
              />
              <button
                type="button"
                onClick={() => docInput.current?.click()}
                className="surface-muted mt-1.5 grid h-28 w-full place-items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="flex flex-col items-center gap-1.5 px-4 text-center">
                  {scanning ? (
                    <>
                      <ScanSearch className="size-6 animate-pulse text-gold" />
                      AI is verifying your authorization letter…
                    </>
                  ) : (
                    <>
                      <Upload className="size-5" />
                      Upload your official EO appointment / authorization letter
                      <span className="text-xs">Issued and approved by your agency (e.g. MOH) — our AI verifies it</span>
                    </>
                  )}
                </span>
              </button>

              {analysis && analysis.authorized && (
                <div className="mt-2 rounded-xl border border-success/25 bg-success/5 p-3">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="size-4 shrink-0 text-success" />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{analysis.documentType}</p>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                      {analysis.source === "gemini" ? "Gemini AI" : "On-device AI"} · {Math.round(analysis.confidence * 100)}%
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li><span className="text-foreground">Appointee:</span> {analysis.holder}</li>
                    <li><span className="text-foreground">Hospital:</span> {analysis.hospitalName ?? "—"}</li>
                    <li><span className="text-foreground">Issued by:</span> {analysis.issuer}</li>
                    <li><span className="text-foreground">Approved by:</span> {analysis.approvedBy}</li>
                  </ul>
                </div>
              )}

              {analysis && !analysis.authorized && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/5 p-3 text-sm">
                  <FileWarning className="size-4 shrink-0 text-danger" />
                  <p className="text-muted-foreground">
                    This doesn&apos;t look like a valid EO authorization letter. Upload the
                    official appointment document issued by your agency, or contact your
                    division administrator.
                  </p>
                </div>
              )}
            </div>

            {/* The letter names your hospital; correct it here only if needed. */}
            <details
              className="block"
              open={pickerOpen}
              onToggle={(e) => setPickerOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                {analysis?.hospitalId
                  ? "Wrong hospital detected? Choose manually"
                  : "Choose your hospital manually"}
              </summary>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium">Hospital</span>
                <span className="text-xs text-muted-foreground">
                  {q ? `${filteredHospitals.length} of ${hospitals.length}` : `${hospitals.length} hospitals`}
                </span>
              </div>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={hospitalQuery}
                  onChange={(e) => setHospitalQuery(e.target.value)}
                  placeholder="Search hospitals…"
                  className="w-full rounded-xl border border-input bg-input/30 py-2.5 pl-9 pr-3 text-sm outline-none focus-visible:border-gold"
                />
              </div>
              <div className="mt-1.5 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-input bg-input/30 p-1.5">
                {filteredHospitals.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No hospitals match “{hospitalQuery}”.
                  </p>
                )}
                {filteredHospitals.map((h) => {
                  const selected = h.id === hospitalId;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setHospitalId(h.id)}
                      aria-pressed={selected}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                        selected ? "bg-gold/15 ring-1 ring-gold" : "hover:bg-secondary"
                      )}
                    >
                      <span className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        selected ? "bg-gold/20 text-gold" : "bg-secondary text-muted-foreground"
                      )}>
                        <Building2 className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{highlight(h.name, q)}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {h.type ?? h.address}
                        </span>
                      </span>
                      {selected && <Check className="size-4 shrink-0 text-gold" />}
                    </button>
                  );
                })}
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                Volunteer opportunities you post will be listed under this hospital.
              </span>
            </details>
            <Button
              type="submit"
              size="lg"
              disabled={!analysis?.authorized}
              className="h-12 w-full bg-gold text-black text-base hover:bg-gold/90 disabled:opacity-50"
            >
              Continue <ArrowRight className="size-5" />
            </Button>
            {!analysis?.authorized && (
              <p className="text-center text-xs text-muted-foreground">
                Verify your authorization document to continue.
              </p>
            )}
          </form>
        )}

        {step === 1 && (
          <div className="space-y-5 text-center">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit verification code sent to your registered device.
            </p>
            <div className="flex justify-center gap-2">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  value={d}
                  inputMode="numeric"
                  maxLength={1}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/, "");
                    setOtp((prev) => prev.map((x, j) => (j === i ? v : x)));
                    if (v && i < 5) otpRefs.current[i + 1]?.focus();
                  }}
                  className="size-12 rounded-xl border border-input bg-input/30 text-center text-lg font-semibold outline-none focus-visible:border-gold"
                />
              ))}
            </div>
            <Button
              size="lg"
              onClick={() => setStep(2)}
              disabled={otp.join("").length < 6}
              className="h-12 w-full bg-gold text-black text-base hover:bg-gold/90"
            >
              Verify Code
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="size-10 animate-spin text-gold" />
            <p className="font-medium">Authenticating…</p>
            <p className="text-sm text-muted-foreground">Verifying credentials and clearance level.</p>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <ShieldCheck className="size-14 text-success" />
            <h2 className="text-xl font-bold">Access Granted</h2>
            <p className="text-sm text-muted-foreground">
              Welcome, Officer. You now have access to emergency management features.
            </p>
            <Button
              size="lg"
              onClick={() => { setOfficerHospitalId(hospitalId); setRole("officer"); router.push("/officer/dashboard"); }}
              className="mt-2 h-12 w-full bg-gold text-black text-base hover:bg-gold/90"
            >
              Go to Officer Dashboard <ArrowRight className="size-5" />
            </Button>
          </div>
        )}

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" /> All access is logged and monitored for security.
        </p>
      </div>
    </div>
  );
}
