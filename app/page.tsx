"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BedDouble,
  HeartHandshake,
  Loader2,
  Search,
  Target,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { OtpInput } from "@/components/auth/otp-input";
import { useRole } from "@/components/providers/role-provider";
import { useProfile } from "@/components/providers/profile-provider";
import { Button } from "@/components/ui/button";
import { countries, defaultCountry } from "@/constants";
import { requestOtp, verifyOtp, type AuthMode } from "@/lib/auth";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: Search, accent: "text-info bg-info/15", title: "Track Cases", desc: "Real-time health and incident updates" },
  { icon: BedDouble, accent: "text-success bg-success/15", title: "Hospital Beds", desc: "Live bed availability and wait times" },
  { icon: HeartHandshake, accent: "text-gold bg-gold/15", title: "Volunteer Efforts", desc: "Active volunteers and urgent tasks" },
];

const RESEND_SECONDS = 30;
type Stage = "phone" | "otp" | "profile";

export default function LandingPage() {
  const router = useRouter();
  const { setProfile } = useProfile();
  const { setRole } = useRole();

  const [mode, setMode] = useState<AuthMode>("signup");
  const [stage, setStage] = useState<Stage>("phone");

  const [iso, setIso] = useState(defaultCountry.iso);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const country = countries.find((c) => c.iso === iso) ?? defaultCountry;
  const fullPhone = `${country.dial} ${phone}`.trim();

  useEffect(() => {
    if (stage !== "otp" || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, countdown]);

  // Step 1 — send the OTP to the phone number.
  const sendCode = async () => {
    setError("");
    setBusy(true);
    const { ok } = await requestOtp(country.dial + phone);
    setBusy(false);
    if (!ok) return setError("Enter a valid phone number.");
    setStage("otp");
    setCode("");
    setCountdown(RESEND_SECONDS);
  };

  // Step 2 — verify the code. New users continue to the name step; returning users go in.
  const confirmCode = async () => {
    setError("");
    setBusy(true);
    const { ok } = await verifyOtp(country.dial + phone, code);
    setBusy(false);
    if (!ok) return setError("Invalid code. Please try again.");
    if (mode === "signup") setStage("profile");
    else router.push("/dashboard");
  };

  // Step 3 (sign-up only) — collect name, then set up emergency access.
  const saveProfile = () => {
    setProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      preferredName: preferredName.trim() || firstName.trim(),
      countryCode: country.dial,
      phone,
    });
    // A brand-new account is always a normal citizen — clears any stale role.
    setRole("citizen");
    router.push("/permissions");
  };

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setStage("phone");
    setError("");
  };

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="glow-danger pointer-events-none absolute inset-x-0 top-0 h-[420px]" />

      <header className="relative z-10 px-8 py-6">
        <Logo />
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-[1400px] flex-1 items-center gap-12 px-8 pb-16 lg:grid-cols-[1.3fr_1fr]">
        {/* Hero */}
        <section>
          <h1 className="text-5xl font-bold tracking-tight max-md:text-4xl">
            Welcome to AidPulse SG
          </h1>
          <p className="mt-3 text-xl font-medium text-info">
            All in one place. Faster Response.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="surface p-5">
                <span className={`flex size-11 items-center justify-center rounded-xl ${f.accent}`}>
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-3 text-danger">
            <Activity className="size-6" />
            <div className="h-px flex-1 bg-gradient-to-r from-danger/60 to-transparent" />
          </div>
        </section>

        {/* Auth card */}
        <section className="surface w-full max-w-md justify-self-end p-8">
          {/* Mode toggle — only on the first step */}
          {stage === "phone" && (
            <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-card/60 p-1">
              {(["signup", "login"] as AuthMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={cn(
                    "rounded-full py-2 text-sm font-medium transition-colors",
                    mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m === "signup" ? "Sign Up" : "Log In"}
                </button>
              ))}
            </div>
          )}

          {/* Step 1 — phone */}
          {stage === "phone" && (
            <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="mt-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">
                  {mode === "signup" ? "Sign Up" : "Welcome back"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === "signup"
                    ? "Enter your phone number to get started."
                    : "Log in with your phone number."}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-input bg-input/30 pr-3 focus-within:border-ring">
                  <select
                    value={iso}
                    onChange={(e) => setIso(e.target.value)}
                    aria-label="Country code"
                    className="rounded-l-xl border-r border-border bg-transparent py-2.5 pl-3 pr-2 text-sm outline-none"
                  >
                    {countries.map((c) => (
                      <option key={c.iso} value={c.iso} className="bg-popover text-foreground">
                        {c.flag} {c.dial}
                      </option>
                    ))}
                  </select>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    placeholder="8123 4567"
                    className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose your country — works internationally.
                </p>
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}

              <Button type="submit" size="lg" disabled={busy} className="h-12 w-full text-base">
                {busy ? <Loader2 className="size-5 animate-spin" /> : null}
                {mode === "signup" ? "Sign Up" : "Log In"}
              </Button>

              {mode === "signup" && (
                <p className="text-center text-xs text-muted-foreground">
                  By signing up, you agree to our Terms of Service and Privacy Policy.
                </p>
              )}
            </form>
          )}

          {/* Step 2 — OTP */}
          {stage === "otp" && (
            <div className="space-y-5 text-center">
              <div>
                <h2 className="text-2xl font-bold">Verify your number</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter the 6-digit code we sent to{" "}
                  <span className="font-medium text-foreground">{fullPhone || "—"}</span>
                </p>
              </div>

              <OtpInput value={code} onChange={setCode} />

              {error && <p className="text-sm text-danger">{error}</p>}

              <Button size="lg" disabled={busy || code.length < 6} onClick={confirmCode} className="h-12 w-full text-base">
                {busy ? <Loader2 className="size-5 animate-spin" /> : null}
                Verify &amp; Continue
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setStage("phone"); setError(""); }}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-4" /> Change number
                </button>
                {countdown > 0 ? (
                  <span className="text-muted-foreground">
                    Resend in 0:{countdown.toString().padStart(2, "0")}
                  </span>
                ) : (
                  <button type="button" onClick={sendCode} className="font-medium text-info hover:underline">
                    Resend code
                  </button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">Demo mode — enter any 6 digits to continue.</p>
            </div>
          )}

          {/* Step 3 — name (sign-up only) */}
          {stage === "profile" && (
            <form onSubmit={(e) => { e.preventDefault(); saveProfile(); }} className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Tell us about you</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your number is verified. What&apos;s your name?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium">First Name</span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoFocus
                    placeholder="First name"
                    className="mt-1.5 w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Last Name</span>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Last name"
                    className="mt-1.5 w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium">What should we call you?</span>
                <input
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="Optional — defaults to your first name"
                  className="mt-1.5 w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
                />
              </label>

              <Button type="submit" size="lg" className="h-12 w-full text-base">
                Continue
              </Button>
            </form>
          )}
        </section>
      </main>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-[1400px] items-center justify-center gap-2 px-8 py-4 text-sm">
          <Target className="size-4 text-danger" />
          <span className="font-semibold text-danger">Our Mission:</span>
          <span className="text-muted-foreground">
            Empower communities, strengthen response, and protect lives.
          </span>
        </div>
      </footer>
    </div>
  );
}
