"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, CameraOff, Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Live QR scanner using the device's rear camera (html5-qrcode). The library is
 * imported dynamically so it never runs during SSR and only ships to the client
 * when scanning actually starts. On the first decoded QR it calls `onScan` and
 * stops the camera. Falls back to an error message (use manual entry) when there
 * is no camera / permission is denied / the page isn't on HTTPS.
 */
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const regionId = "qr-region-" + useId().replace(/:/g, "");
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  // Keep the latest onScan without restarting the camera effect.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let handled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any = null;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        instance = new Html5Qrcode(regionId, { verbose: false });
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded: string) => {
            if (handled) return;
            handled = true;
            onScanRef.current(decoded);
            setActive(false); // triggers cleanup → camera stops
          },
          () => {}, // per-frame decode misses — ignore
        );
        if (!cancelled) setStarting(false);
      } catch {
        if (!cancelled) {
          setError("Couldn't start the camera. Allow camera access (and use HTTPS), or enter the code below.");
          setStarting(false);
          setActive(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (instance) {
        instance.stop().then(() => instance.clear()).catch(() => {});
      }
    };
  }, [active, regionId]);

  return (
    <div>
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl border border-dashed border-border bg-secondary/30">
        {/* html5-qrcode injects the <video> here */}
        <div id={regionId} className={active ? "size-full [&_video]:size-full [&_video]:object-cover" : "hidden"} />

        {!active && (
          <div className="text-center text-muted-foreground">
            <Camera className="mx-auto size-10" />
            <p className="mt-2 text-sm">{starting ? "Starting camera…" : "Scan the mission QR code"}</p>
            <p className="text-xs">Use your phone&apos;s camera to check in</p>
          </div>
        )}

        {active && (
          <>
            <ScanLine className="pointer-events-none absolute inset-x-10 top-1/2 size-auto text-info/60" />
            <span className="pointer-events-none absolute inset-6 rounded-xl border-2 border-info/60" />
          </>
        )}

        {starting && (
          <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs">
            <Loader2 className="size-3 animate-spin" /> Starting…
          </span>
        )}
      </div>

      <Button
        type="button"
        variant={active ? "secondary" : "default"}
        onClick={() => {
          setError("");
          setStarting(!active); // becomes true when we're turning the camera on
          setActive((v) => !v);
        }}
        className="mt-3 w-full"
      >
        {active ? <><CameraOff className="size-4" /> Stop camera</> : <><Camera className="size-4" /> Scan with camera</>}
      </Button>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
