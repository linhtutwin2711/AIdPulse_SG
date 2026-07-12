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
  // The auth card stays hidden until the visitor asks for it — the marketing
  // page reads freely; "Get Started" (or header "Log In") reveals the card.
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (showAuth) {
      // wait one frame so the card exists before scrolling to it
      requestAnimationFrame(() =>
        document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth", block: "center" })
      );
    }
  }, [showAuth]);

  const openAuth = (m: AuthMode) => {
    setMode(m);
    setStage("phone");
    setError("");
    setShowAuth(true);
  };

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
    const { ok, error } = await requestOtp(country.dial + phone);
    setBusy(false);
    if (!ok) return setError(error ?? "Enter a valid phone number.");
    setStage("otp");
    setCode("");
    setCountdown(RESEND_SECONDS);
  };

  // Step 2 — verify the code. New users continue to the name step; returning users go in.
  const confirmCode = async () => {
    setError("");
    setBusy(true);
    const { ok, error } = await verifyOtp(country.dial + phone, code);
    setBusy(false);
    if (!ok) return setError(error ?? "Invalid code. Please try again.");
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

      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <Logo />
        <button
          type="button"
          onClick={() => openAuth("login")}
          className="rounded-full border border-border bg-card/60 px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Log In
        </button>
      </header>

      <main
        className={cn(
          "relative z-10 mx-auto grid w-full max-w-[1400px] flex-1 items-center gap-12 px-8 pb-16",
          showAuth && "lg:grid-cols-[1.3fr_1fr]"
        )}
      >
        {/* Hero */}
        <section>
          <p className="inline-flex items-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
            <Activity className="size-3.5" /> Live emergency response for Singapore
          </p>
          <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight max-md:text-4xl">
            Every alert, map and hospital —{" "}
            <span className="text-danger">one app</span>.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Stop juggling news sites, hotlines and rumour mills during a health
            crisis. AidPulse SG puts live case maps, hospital beds, verified
            alerts and volunteering in one place — so you can act in seconds,
            not hours.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button
              size="lg"
              onClick={() => openAuth("signup")}
              className="h-12 px-7 text-base"
            >
              Get Started — it&apos;s free
            </Button>
            <span className="text-sm text-muted-foreground">
              Free forever · No card needed · Works on any phone
            </span>
          </div>

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
        </section>

        {/* Auth card — revealed by "Get Started" / "Log In" */}
        {showAuth && (
        <section id="get-started" className="surface w-full max-w-md justify-self-end p-8">
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
                <p className="mt-2 text-xs text-info">
                  Demo mode: no SMS is sent. Use code <span className="font-semibold">123456</span> on the next screen.
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
                <p className="mt-2 text-sm text-info">
                  Demo code: <span className="font-semibold">123456</span>. No real SMS is sent.
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

              <p className="text-xs text-muted-foreground">
                Demo mode: no SMS is sent. Use <span className="font-semibold">123456</span> to continue.
              </p>
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
        )}
      </main>

      {/* How it works */}
      <section className="relative z-10 border-t border-border">
        <div className="mx-auto max-w-[1400px] px-8 py-16">
          <h2 className="text-center text-3xl font-bold">From worried to prepared in 4 steps</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-muted-foreground">
            No forms, no waiting — you&apos;re protected within a minute of signing up.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              { n: "1", t: "Sign up with your phone", d: "One number, one code — no passwords to remember, no email chains." },
              { n: "2", t: "Allow location & alerts", d: "So AidPulse can warn you about risks near you, the moment they appear." },
              { n: "3", t: "See what's around you", d: "Live case clusters, hospital bed availability and verified alerts on one map." },
              { n: "4", t: "Report & respond", d: "Report incidents in 30 seconds, or step up as a volunteer when help is needed." },
            ].map((s) => (
              <div key={s.n} className="surface relative p-6">
                <span className="flex size-9 items-center justify-center rounded-full bg-danger/15 text-sm font-bold text-danger">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold">{s.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="relative z-10 border-t border-border">
        <div className="mx-auto max-w-[1400px] px-8 py-16">
          <h2 className="text-center text-3xl font-bold">
            Replace five tabs with <span className="text-danger">one app</span>
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-muted-foreground">
            News sites, hospital hotlines, chat groups, volunteer boards, official advisories —
            AidPulse brings them together.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Live case map", d: "Real NEA dengue clusters and community reports, updated automatically — filter by disease and area." },
              { t: "Hospital beds in real time", d: "30 Singapore hospitals with ward-level availability, kept current by on-site emergency officers." },
              { t: "AI assistant, 24/7", d: "Ask anything about symptoms, safety steps or the nearest open hospital — answers grounded in live data." },
              { t: "Emergency broadcasts", d: "Verified officer alerts reach your lock screen like a government advisory — even with the app closed." },
              { t: "Volunteer in minutes", d: "Upload a certificate, let AI match your skills, and check in to missions with a QR code." },
              { t: "Friends & responders", d: "Find friends by phone number, message them live, and let officers coordinate hospital-to-hospital." },
            ].map((f) => (
              <div key={f.t} className="surface p-6">
                <h3 className="font-semibold">{f.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 border-t border-border">
        <div className="mx-auto max-w-[1400px] px-8 py-16">
          <h2 className="text-center text-3xl font-bold">Trusted across the island</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { q: "During the last dengue spike I knew exactly which streets to avoid on the school run. My neighbours were still forwarding rumours.", n: "Mei Lin", r: "Parent · Tampines" },
              { q: "I uploaded my first-aid cert and had a hospital mission matched to me the same evening. Checking in was literally one QR scan.", n: "Arjun", r: "Volunteer · Clementi" },
              { q: "Ward capacity used to go out by phone calls. Now I update beds once and every responder sees it instantly.", n: "Dr. Farah", r: "Emergency Officer · Woodlands" },
            ].map((t) => (
              <figure key={t.n} className="surface p-6">
                <blockquote className="text-sm leading-relaxed">&ldquo;{t.q}&rdquo;</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold">{t.n}</span>
                  <span className="text-muted-foreground"> · {t.r}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 border-t border-border">
        <div className="mx-auto max-w-3xl px-8 py-16">
          <h2 className="text-center text-3xl font-bold">Frequently asked questions</h2>
          <div className="mt-8 space-y-3">
            {[
              { q: "Is AidPulse SG really free?", a: "Yes — completely free for citizens, volunteers and officers. It's a community resilience project, not a subscription product." },
              { q: "What happens to my data?", a: "Your phone number and reports are used only for emergency alerts and response coordination. Location is used to show nearby risks, never sold or shared with advertisers. Health reports are aggregated and PII-protected." },
              { q: "Does it work on my phone?", a: "Yes — AidPulse runs in any modern browser. Add it to your home screen and it installs like a native app, with emergency broadcasts on your lock screen." },
              { q: "How do I become a volunteer?", a: "Verify your email, upload any certificates you have (our AI reads them and matches you to opportunities), and you're in — most people finish in under two minutes." },
              { q: "Who can send emergency broadcasts?", a: "Only verified Emergency Officers — access requires an official agency authorization letter checked by AI, so alerts you receive are trustworthy." },
            ].map((f) => (
              <details key={f.q} className="surface group p-5">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

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
