"use client";

import { useState } from "react";
import { Building2, CalendarDays, CheckCircle2, Clock, Plus, ShieldCheck, Users } from "lucide-react";
import { OfficerNav } from "@/components/officer/officer-nav";
import { useRole } from "@/components/providers/role-provider";
import { useOpportunities } from "@/components/providers/opportunities-provider";
import { getHospital, getHospitals } from "@/lib/data";
import { urgencyClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Urgency } from "@/types";

const ROLE_TYPES = ["General Volunteer", "Healthcare Support", "Logistics Support"];
const SKILL_OPTIONS = [
  "General Volunteer",
  "Healthcare Support",
  "Logistics Support",
  "First Aid",
  "Certificate Required",
  "Hospital Role",
];
const URGENCIES: { id: Urgency; label: string }[] = [
  { id: "urgent", label: "Urgent" },
  { id: "soon", label: "Soon" },
  { id: "flexible", label: "Flexible" },
];

export default function OfficerPostOpportunityPage() {
  const { officerHospitalId } = useRole();
  const { opportunities, postOpportunity } = useOpportunities();
  // The officer posts under their own hospital (chosen at sign-in); fall back to
  // the first hospital if somehow unset (e.g. an officer signed in before this).
  const hospital = (officerHospitalId ? getHospital(officerHospitalId) : undefined) ?? getHospitals()[0];

  const [title, setTitle] = useState("");
  const [roleType, setRoleType] = useState(ROLE_TYPES[0]);
  const [skills, setSkills] = useState<string[]>([ROLE_TYPES[0]]);
  const [date, setDate] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("soon");
  const [hours, setHours] = useState("4");
  const [people, setPeople] = useState("5");
  const [justPosted, setJustPosted] = useState<string | null>(null);

  const toggleSkill = (s: string) =>
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const canSubmit = title.trim() !== "" && date.trim() !== "" && skills.length > 0 && !!hospital;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital || !canSubmit) return;
    postOpportunity({
      title,
      org: hospital.name,
      location: hospital.address || hospital.name,
      date,
      roleType,
      skills,
      urgency,
      hours: Math.max(1, parseInt(hours || "1", 10)),
      slots: Math.max(1, parseInt(people || "1", 10)),
      distanceKm: 0,
    });
    setJustPosted(title.trim());
    setTitle("");
    setDate("");
    setHours("4");
    setPeople("5");
    setRoleType(ROLE_TYPES[0]);
    setSkills([ROLE_TYPES[0]]);
    setUrgency("soon");
  };

  // Opportunities posted through this screen (seed opportunities have no createdAt).
  const myPosted = opportunities.filter((o) => o.createdAt);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Post an Opportunity</h1>
          <p className="text-sm text-muted-foreground">
            Create a volunteer opportunity for your hospital. It appears instantly in volunteers&apos; Nearby Opportunities.
          </p>
        </div>
        <OfficerNav />
      </div>

      <div className="surface flex items-center gap-3 p-4">
        <span className="flex size-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <Building2 className="size-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">Posting as</p>
          <p className="font-semibold">{hospital?.name ?? "Your hospital"}</p>
        </div>
        <span className="pill ml-auto gap-1 bg-gold/15 text-gold">
          <ShieldCheck className="size-3.5" /> Emergency Officer
        </span>
      </div>

      {justPosted && (
        <div className="surface flex items-center gap-3 border-success/40 p-4 text-sm text-success">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>
            <span className="font-medium">{justPosted}</span> is now live for volunteers to apply.
          </span>
        </div>
      )}

      <form onSubmit={submit} className="surface space-y-5 p-6">
        <label className="block">
          <span className="text-sm font-medium">Opportunity title</span>
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setJustPosted(null); }}
            placeholder="e.g. Emergency Department Support"
            className="mt-1.5 w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Role type</span>
            <select
              value={roleType}
              onChange={(e) => setRoleType(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none"
            >
              {ROLE_TYPES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium">Date &amp; time</span>
            <input
              value={date}
              onChange={(e) => { setDate(e.target.value); setJustPosted(null); }}
              placeholder="e.g. 30 May 2026 · 9:00 AM"
              className="mt-1.5 w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
            />
          </label>
        </div>

        <div>
          <span className="text-sm font-medium">Skills / requirements</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {SKILL_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSkill(s)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  skills.includes(s)
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <span className="text-sm font-medium">Urgency</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {URGENCIES.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUrgency(u.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    urgency === u.id
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <label className="block">
              <span className="text-sm font-medium">Estimated hours</span>
              <input
                value={hours}
                onChange={(e) => setHours(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="e.g. 4"
                className="mt-1.5 w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
              />
            </label>

            <label className="block">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Users className="size-3.5" /> People needed
              </span>
              <input
                value={people}
                onChange={(e) => setPeople(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="e.g. 5"
                className="mt-1.5 w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
              />
            </label>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!canSubmit}
          size="lg"
          className="h-12 w-full bg-gold text-black text-base hover:bg-gold/90"
        >
          <Plus className="size-5" /> Post opportunity
        </Button>
      </form>

      {myPosted.length > 0 && (
        <section className="space-y-3">
          <p className="font-semibold">Posted by your hospital</p>
          {myPosted.map((o) => (
            <div key={o.id} className="surface p-5">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{o.title}</p>
                <span className={cn("pill", urgencyClass[o.urgency])}>{o.urgency}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>{o.org} · {o.location}</span>
                <span className="flex items-center gap-1"><CalendarDays className="size-3.5" /> {o.date}</span>
                <span className="flex items-center gap-1"><Clock className="size-3.5" /> {o.hours}h</span>
                {o.slots != null && (
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" /> {o.filled ?? 0}/{o.slots} filled
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
