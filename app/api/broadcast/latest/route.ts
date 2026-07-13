import { NextResponse } from "next/server";
import { getLatestBroadcast } from "../store";

/**
 * Open app tabs poll this to surface a new officer broadcast in-app — a
 * reliable fallback to OS push (which needs a per-device subscription and OS
 * notification permission). Returns the most recent broadcast, or null.
 */
export async function GET() {
  return NextResponse.json(
    { broadcast: await getLatestBroadcast() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
