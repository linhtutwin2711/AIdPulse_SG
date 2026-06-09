"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Info,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { PrivacyPolicy } from "@/components/legal/privacy-policy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Perm = "prompt" | "granted" | "denied";

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
        on ? "bg-danger" : "bg-secondary"
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          on ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

function StatusNote({ state }: { state: Perm }) {
  if (state === "granted")
    return <p className="mt-0.5 text-xs font-medium text-success">✓ Allowed</p>;
  if (state === "denied")
    return (
      <p className="mt-0.5 text-xs font-medium text-danger">
        Blocked — enable it in your browser settings
      </p>
    );
  return <p className="mt-0.5 text-xs text-muted-foreground">Tap to allow</p>;
}

export default function PermissionsPage() {
  const router = useRouter();
  const [loc, setLoc] = useState<Perm>("prompt");
  const [notif, setNotif] = useState<Perm>("prompt");

  // Reflect any already-decided permissions without re-prompting.
  useEffect(() => {
    if ("Notification" in window) {
      setNotif(Notification.permission === "default" ? "prompt" : (Notification.permission as Perm));
    }
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((r) => {
        setLoc(r.state as Perm);
        r.onchange = () => setLoc(r.state as Perm);
      })
      .catch(() => {});
  }, []);

  const requestLocation = () => {
    if (loc === "granted") return setLoc("prompt"); // visual off (browser keeps the grant)
    if (!("geolocation" in navigator)) return setLoc("denied");
    navigator.geolocation.getCurrentPosition(
      () => setLoc("granted"),
      (err) => setLoc(err.code === err.PERMISSION_DENIED ? "denied" : "prompt"),
      { timeout: 10000 }
    );
  };

  const requestNotifications = async () => {
    if (notif === "granted") return setNotif("prompt"); // visual off
    if (!("Notification" in window)) return setNotif("denied");
    const res = await Notification.requestPermission();
    if (res === "granted") {
      setNotif("granted");
      // A real notification proves the permission actually works.
      new Notification("AidPulse SG", { body: "Emergency alerts are now enabled." });
    } else {
      setNotif(res === "default" ? "prompt" : "denied");
    }
  };

  return (
    <div className="relative min-h-dvh">
      <div className="glow-danger pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <header className="relative z-10 px-8 py-6">
        <Logo />
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-[1300px] items-center gap-12 px-8 py-10 lg:grid-cols-2">
        {/* Illustration side */}
        <section className="text-center">
          <h1 className="text-3xl font-bold">We help keep you safe</h1>
          <div className="surface relative mt-8 grid place-items-center gap-6 p-10">
            <div className="flex size-28 items-center justify-center rounded-3xl bg-gradient-to-br from-danger to-info">
              <ShieldCheck className="size-14 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { icon: MapPin, label: "See Nearby Risks", c: "text-danger bg-danger/15" },
                { icon: Bell, label: "Get Important Alerts", c: "text-gold bg-gold/15" },
                { icon: Building2, label: "Find Nearby Hospitals", c: "text-info bg-info/15" },
                { icon: BadgeCheck, label: "Stay Informed", c: "text-success bg-success/15" },
              ].map((b) => (
                <div key={b.label} className="surface-muted flex items-center gap-2 p-3">
                  <span className={`flex size-8 items-center justify-center rounded-lg ${b.c}`}>
                    <b.icon className="size-4" />
                  </span>
                  <span>{b.label}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              We use these permissions to keep you informed and safe.
            </p>
          </div>
        </section>

        {/* Permissions side */}
        <section>
          <h2 className="text-2xl font-bold">Set up your emergency access</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Allow permissions to get started.
          </p>

          <div className="mt-6 space-y-3">
            <div className="surface flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-danger/15 text-danger">
                  <MapPin className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">Location Access</p>
                  <p className="text-sm text-muted-foreground">
                    See nearby risks, hospitals &amp; volunteers
                  </p>
                  <StatusNote state={loc} />
                </div>
              </div>
              <Toggle on={loc === "granted"} onToggle={requestLocation} />
            </div>

            <div className="surface flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
                  <Bell className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get important alerts and updates
                  </p>
                  <StatusNote state={notif} />
                </div>
              </div>
              <Toggle on={notif === "granted"} onToggle={requestNotifications} />
            </div>
          </div>

          <Button
            size="lg"
            onClick={() => router.push("/dashboard")}
            className="mt-5 h-12 w-full text-base"
          >
            <CheckCircle2 className="size-5" /> Continue
          </Button>

          <PrivacyPolicy className="mt-3" />

          <div className="surface-muted mt-4 flex items-start gap-3 p-4 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-info" />
            Your information is used only for emergency alerts and nearby support.
          </div>
        </section>
      </main>
    </div>
  );
}
