"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Check,
  Download,
  Info,
  Palette,
  Pencil,
  Shield,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { useProfile } from "@/components/providers/profile-provider";
import { useSettings } from "@/components/providers/settings-provider";
import { Button } from "@/components/ui/button";
import { countries, defaultCountry } from "@/constants";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "account", label: "Account", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy & Data", icon: Shield },
  { id: "about", label: "About", icon: Info },
] as const;
type TabId = (typeof TABS)[number]["id"];

const ACCENTS = [
  { name: "Blue", c: "#3b82f6" },
  { name: "Violet", c: "#8b5cf6" },
  { name: "Emerald", c: "#10b981" },
  { name: "Rose", c: "#f43f5e" },
  { name: "Amber", c: "#f59e0b" },
  { name: "Cyan", c: "#06b6d4" },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
        on ? "bg-info" : "bg-secondary"
      )}
    >
      <span className={cn("inline-block size-5 rounded-full bg-white shadow-sm transition-transform", on ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
}

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsView />
    </Suspense>
  );
}

function SettingsView() {
  const params = useSearchParams();
  const initial = (params.get("tab") as TabId) || "account";
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === initial) ? initial : "account");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Tab nav */}
        <aside>
          <nav className="surface flex gap-1 p-2 lg:flex-col">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:flex-none",
                  tab === t.id ? "bg-info/15 text-info" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <t.icon className="size-4" /> {t.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          {tab === "account" && <AccountTab />}
          {tab === "appearance" && <AppearanceTab />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "privacy" && <PrivacyTab />}
          {tab === "about" && <AboutTab />}
        </main>
      </div>
    </div>
  );
}

function AccountTab() {
  const { profile, setProfile, initials } = useProfile();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [preferredName, setPreferredName] = useState(profile.preferredName);
  const [iso, setIso] = useState(countries.find((c) => c.dial === profile.countryCode)?.iso ?? defaultCountry.iso);
  const [phone, setPhone] = useState(profile.phone);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const country = countries.find((c) => c.iso === iso) ?? defaultCountry;

  const resetToProfile = () => {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPreferredName(profile.preferredName);
    setIso(countries.find((c) => c.dial === profile.countryCode)?.iso ?? defaultCountry.iso);
    setPhone(profile.phone);
  };

  const cancel = () => {
    resetToProfile();
    setEditing(false);
  };

  const save = () => {
    setProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      preferredName: preferredName.trim() || firstName.trim(),
      countryCode: country.dial,
      phone,
    });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const field =
    "mt-1.5 w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none focus-visible:border-ring disabled:cursor-default disabled:opacity-60";

  return (
    <div className="surface space-y-5 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-lg font-bold text-white">{initials}</span>
          <div>
            <p className="font-semibold">{profile.preferredName || profile.firstName || "Your profile"}</p>
            <p className="text-sm text-muted-foreground">{country.dial} {phone || "—"}</p>
          </div>
        </div>
        {!editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="text-sm font-medium">First Name</span>
          <input value={firstName} disabled={!editing} onChange={(e) => setFirstName(e.target.value)} className={field} /></label>
        <label className="block"><span className="text-sm font-medium">Last Name</span>
          <input value={lastName} disabled={!editing} onChange={(e) => setLastName(e.target.value)} className={field} /></label>
      </div>
      <label className="block"><span className="text-sm font-medium">What should we call you?</span>
        <input value={preferredName} disabled={!editing} onChange={(e) => setPreferredName(e.target.value)} placeholder="Preferred name" className={field} /></label>
      <div>
        <span className="text-sm font-medium">Phone Number</span>
        <div className={cn("mt-1.5 flex items-center gap-2 rounded-xl border border-input bg-input/30 pr-3", !editing && "opacity-60")}>
          <select value={iso} disabled={!editing} onChange={(e) => setIso(e.target.value)} className="rounded-l-xl border-r border-border bg-transparent py-2.5 pl-3 pr-2 text-sm outline-none disabled:cursor-default">
            {countries.map((c) => <option key={c.iso} value={c.iso} className="bg-popover">{c.flag} {c.dial}</option>)}
          </select>
          <input value={phone} disabled={!editing} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="8123 4567" className="flex-1 bg-transparent py-2.5 text-sm outline-none disabled:cursor-default" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <Button onClick={save}>Save changes</Button>
            <Button variant="ghost" onClick={cancel}>Cancel</Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Tap <span className="font-medium text-foreground">Edit</span> to update your details.</p>
        )}
        {saved && <span className="flex items-center gap-1 text-sm text-success"><Check className="size-4" /> Saved</span>}
      </div>
    </div>
  );
}

function AppearanceTab() {
  const { settings, update } = useSettings();
  return (
    <div className="space-y-4">
      <div className="surface p-6">
        <h3 className="font-semibold">Accent Color</h3>
        <p className="text-sm text-muted-foreground">Recolors highlights, links and the AI assistant instantly.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.c}
              onClick={() => update({ accent: a.c })}
              title={a.name}
              className={cn("flex size-10 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition", settings.accent === a.c && "ring-2 ring-white")}
              style={{ background: a.c }}
            >
              {settings.accent === a.c && <Check className="size-5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      <div className="surface p-6">
        <h3 className="font-semibold">Theme</h3>
        <div className="mt-3 flex gap-3">
          <div className="flex-1 rounded-xl border-2 border-info bg-secondary/40 p-4 text-sm font-medium">🌙 Dark <span className="ml-1 text-info">· Active</span></div>
          <div className="flex-1 cursor-not-allowed rounded-xl border border-border p-4 text-sm text-muted-foreground">☀️ Light <span className="ml-1">· Soon</span></div>
        </div>
      </div>

      <div className="surface p-6">
        <Row title="Reduce motion" desc="Minimize animations and transitions across the app.">
          <Toggle on={settings.reduceMotion} onToggle={() => update({ reduceMotion: !settings.reduceMotion })} />
        </Row>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const { settings, update } = useSettings();
  // Start from a stable default so the server and the first client render
  // match; read the real browser permission only after mount.
  const [perm, setPerm] = useState<string>("default");
  useEffect(() => {
    setPerm("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  const enable = async () => {
    if (!("Notification" in window)) return setPerm("unsupported");
    const p = await Notification.requestPermission();
    setPerm(p);
  };
  const test = async () => {
    if (!("Notification" in window)) return;
    let p = Notification.permission;
    if (p !== "granted") p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") new Notification("AidPulse SG", { body: "This is a test notification." });
  };

  const types: { key: keyof typeof settings.notif; title: string; desc: string }[] = [
    { key: "alerts", title: "High-risk alerts", desc: "Critical dengue/disease cluster warnings near you." },
    { key: "cases", title: "Case updates", desc: "Changes in active and critical case numbers." },
    { key: "volunteer", title: "Volunteer opportunities", desc: "New missions matched to your skills." },
    { key: "news", title: "News updates", desc: "Latest public-health updates." },
  ];

  return (
    <div className="space-y-4">
      <div className="surface p-6">
        <Row title="Browser notifications" desc={perm === "granted" ? "Enabled" : perm === "denied" ? "Blocked in your browser settings" : "Allow AidPulse to send alerts."}>
          {perm === "granted" ? (
            <span className="pill bg-success/15 text-success"><Check className="size-3" /> Enabled</span>
          ) : (
            <Button variant="outline" onClick={enable}>Enable</Button>
          )}
        </Row>
        <div className="border-t border-border pt-2">
          {types.map((t) => (
            <Row key={t.key} title={t.title} desc={t.desc}>
              <Toggle on={settings.notif[t.key]} onToggle={() => update({ notif: { [t.key]: !settings.notif[t.key] } as never })} />
            </Row>
          ))}
        </div>
        <Button variant="outline" className="mt-2" onClick={test}><Zap className="size-4" /> Send test notification</Button>
      </div>
    </div>
  );
}

function PrivacyTab() {
  const router = useRouter();
  const [done, setDone] = useState("");

  const flash = (m: string) => { setDone(m); setTimeout(() => setDone(""), 1800); };

  const exportData = () => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("aidpulse:"));
    const data = Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)]));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aidpulse-data.json";
    a.click();
    URL.revokeObjectURL(url);
    flash("Data exported");
  };

  const clearActivity = () => {
    if (!confirm("Clear your reposts, comments and messages?")) return;
    localStorage.removeItem("aidpulse:updates");
    localStorage.removeItem("aidpulse:messages");
    location.reload();
  };

  const resetAll = () => {
    if (!confirm("This erases all local AidPulse data and signs you out. Continue?")) return;
    Object.keys(localStorage).filter((k) => k.startsWith("aidpulse:")).forEach((k) => localStorage.removeItem(k));
    router.push("/");
  };

  return (
    <div className="space-y-4">
      <div className="surface p-6">
        <h3 className="font-semibold">Your Data</h3>
        <p className="text-sm text-muted-foreground">Everything is stored locally on this device.</p>
        <div className="mt-4 space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={exportData}><Download className="size-4" /> Export my data (JSON)</Button>
          <Button variant="outline" className="w-full justify-start" onClick={clearActivity}><Trash2 className="size-4" /> Clear activity (reposts, comments, messages)</Button>
          <Button variant="destructive" className="w-full justify-start" onClick={resetAll}><Trash2 className="size-4" /> Reset all data &amp; sign out</Button>
        </div>
        {done && <p className="mt-3 flex items-center gap-1 text-sm text-success"><Check className="size-4" /> {done}</p>}
      </div>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="surface space-y-3 p-6 text-sm">
      <h3 className="font-semibold">AidPulse SG</h3>
      <p className="text-muted-foreground">Real-time health &amp; emergency response for Singapore — track cases, hospital beds, and coordinate volunteers.</p>
      <ul className="space-y-1 text-muted-foreground">
        <li>Version <span className="text-foreground">0.1.0 (prototype)</span></li>
        <li>Built by <span className="text-foreground">BrainByte</span></li>
      </ul>
      <div className="flex gap-3 pt-1 text-info">
        <button className="hover:underline">Terms</button>
        <button className="hover:underline">Privacy Policy</button>
        <button className="hover:underline">Help</button>
      </div>
    </div>
  );
}
