"use client";

import { useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const POLICIES: { title: string; body: string }[] = [
  {
    title: "1. Information We Collect",
    body: "We collect your phone number, approximate location, and any reports you submit so we can deliver nearby emergency alerts, hospital information, and response support.",
  },
  {
    title: "2. Location Data",
    body: "Your location is used only to show nearby risks, hospitals, and volunteer opportunities, and to route emergency assistance. You can disable location access at any time in your device settings.",
  },
  {
    title: "3. Notifications",
    body: "We send notifications for high-risk alerts, case updates, and emergency broadcasts in your area. You may opt out of non-critical notifications without losing access to emergency alerts.",
  },
  {
    title: "4. Health & Report Data",
    body: "Symptom reports, exposure details, and test results are kept confidential and used solely for public-health response. They are aggregated and never sold.",
  },
  {
    title: "5. Data Sharing",
    body: "Information may be shared with authorized emergency officers and partner agencies (e.g. MOH, SCDF, NEA) strictly for coordinating a response. We do not share data with advertisers.",
  },
  {
    title: "6. Data Retention",
    body: "Personal data is retained only as long as needed for emergency response and legal obligations, after which it is anonymized or securely deleted.",
  },
  {
    title: "7. Your Rights",
    body: "You may request access to, correction of, or deletion of your data at any time. Contact us to exercise these rights.",
  },
  {
    title: "8. Contact",
    body: "Questions about this policy? Reach our data protection team at privacy@aidpulse.sg.",
  },
];

export function PrivacyPolicy({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("text-center", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-danger transition-colors hover:text-danger/80"
      >
        <ShieldCheck className="size-4" />
        Privacy Policy
        <ChevronDown className={cn("size-4 transition-transform duration-300", open && "rotate-180")} />
      </button>

      {/* grid-rows trick: animates smoothly to the content's natural height */}
      <div
        className={cn(
          "grid text-left transition-all duration-300 ease-out",
          open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="surface-muted max-h-72 space-y-3 overflow-y-auto p-4 no-scrollbar">
            {POLICIES.map((p) => (
              <div key={p.title}>
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
