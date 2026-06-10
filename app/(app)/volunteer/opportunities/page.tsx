"use client";

import { useState } from "react";
import { Award, Check, Clock, MapPin, Navigation, Plus, Search, ShieldCheck, Siren, Users } from "lucide-react";
import { urgencyClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useMissions } from "@/components/providers/missions-provider";
import { useOpportunities } from "@/components/providers/opportunities-provider";
import { Button } from "@/components/ui/button";
import { VolunteerNav } from "@/components/volunteer/volunteer-nav";

type Tab = "all" | "near" | "cert" | "urgent";
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All Opportunities" },
  { id: "near", label: "Near Me" },
  { id: "cert", label: "Certificate Match" },
  { id: "urgent", label: "Urgent" },
];

export default function OpportunitiesPage() {
  const { opportunities: all } = useOpportunities();
  const { hasApplied, applyToOpportunity } = useMissions();
  const [tab, setTab] = useState<Tab>("all");

  const list = all.filter((o) => {
    if (tab === "near") return o.distanceKm <= 2;
    if (tab === "cert") return o.matched;
    if (tab === "urgent") return o.urgency === "urgent";
    return true;
  });

  const overview = [
    { label: "Nearby Now", value: all.length, icon: MapPin, c: "text-info" },
    { label: "Certificate Match", value: all.filter((o) => o.matched).length, icon: Award, c: "text-success" },
    { label: "Urgent Today", value: all.filter((o) => o.urgency === "urgent").length, icon: Siren, c: "text-danger" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Nearby Opportunities</h1>
          <p className="text-sm text-muted-foreground">
            Matched to your location, certificates, and expertise.
          </p>
        </div>
        <VolunteerNav />
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-4">
        <div className="surface p-5">
          <p className="font-semibold">Opportunity Overview</p>
          <ul className="mt-3 space-y-3">
            {overview.map((o) => (
              <li key={o.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <o.icon className={cn("size-4", o.c)} /> {o.label}
                </span>
                <span className="font-semibold">{o.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="surface p-5 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Filter Opportunities</p>
          <p className="mt-2">Distance, type, expertise and access level filters help narrow matches to your certificates and skills.</p>
        </div>
      </aside>

      <section>
        <div className="flex justify-end">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground max-md:hidden">
            <Search className="size-4" /> Search opportunities…
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t.id ? "border-transparent bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {list.map((o) => {
            const applied = hasApplied(o.id);
            // Filled = others already signed up + your own active application.
            const taken = (o.filled ?? 0) + (applied ? 1 : 0);
            const full = o.slots != null && taken >= o.slots;
            return (
            <div key={o.id} className="surface flex items-center gap-4 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                <MapPin className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{o.title}</p>
                  <span className={cn("pill", urgencyClass[o.urgency])}>{o.urgency}</span>
                  {o.createdAt && <span className="pill bg-gold/15 text-[10px] text-gold">New</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span>{o.org} · {o.location}</span>
                  <span className="flex items-center gap-1"><Clock className="size-3.5" /> {o.date}</span>
                  {o.distanceKm > 0 && (
                    <span className="flex items-center gap-1"><Navigation className="size-3.5" /> {o.distanceKm} km</span>
                  )}
                  {o.slots != null && (
                    <span className={cn("flex items-center gap-1", full && "text-danger")}>
                      <Users className="size-3.5" /> {taken}/{o.slots} filled
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {o.skills.map((s) => (
                    <span key={s} className="pill bg-secondary text-xs text-muted-foreground">{s}</span>
                  ))}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-gold" /> Posted by {o.org} · Emergency Officer
                </p>
              </div>
              {applied ? (
                <span className="pill shrink-0 gap-1 bg-success/15 text-success">
                  <Check className="size-3.5" /> Applied
                </span>
              ) : full ? (
                <span className="pill shrink-0 gap-1 bg-secondary text-muted-foreground">Full</span>
              ) : (
                <Button onClick={() => applyToOpportunity(o)} className="shrink-0">
                  <Plus className="size-4" /> Apply
                </Button>
              )}
            </div>
            );
          })}
          {list.length === 0 && (
            <div className="surface p-10 text-center text-sm text-muted-foreground">
              No opportunities in this category right now.
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
