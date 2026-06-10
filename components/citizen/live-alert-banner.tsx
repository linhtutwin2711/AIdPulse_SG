"use client";

import { useEffect, useState } from "react";
import { AlertBanner } from "@/components/citizen/alert-banner";
import { fetchBannerAlert } from "@/lib/data";
import type { Alert } from "@/types";

/**
 * Client wrapper for the citizen dashboard's HIGH RISK banner.
 *
 * Fetches the live `case_clusters` row where is_banner = true and feeds it to
 * the (unchanged) AlertBanner. Renders nothing while loading or when there is
 * no banner row, so the page never crashes on empty data. This keeps the
 * citizen page a server component and leaves AlertBanner + getHighRiskAlert
 * intact for the volunteer/officer dashboards.
 */
export function LiveAlertBanner() {
  const [alert, setAlert] = useState<Alert | null>(null);

  useEffect(() => {
    let active = true;
    fetchBannerAlert()
      .then((data) => active && setAlert(data))
      .catch((err) => console.error("LiveAlertBanner fetchBannerAlert failed:", err));
    return () => {
      active = false;
    };
  }, []);

  if (!alert) return null;
  return <AlertBanner alert={alert} />;
}
