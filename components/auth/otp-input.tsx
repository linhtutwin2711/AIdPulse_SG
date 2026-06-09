"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/** Accessible N-box one-time-code input with paste, backspace and arrow support. */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus = true,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  autoFocus?: boolean;
  className?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const setAt = (i: number, c: string) => {
    const arr = chars.slice();
    arr[i] = c;
    onChange(arr.join("").slice(0, length));
  };

  return (
    <div className={cn("flex justify-center gap-2", className)}>
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={c}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && i === 0}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            if (!digits) return setAt(i, "");
            setAt(i, digits[digits.length - 1]);
            if (i < length - 1) focus(i + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !chars[i] && i > 0) focus(i - 1);
            if (e.key === "ArrowLeft") focus(i - 1);
            if (e.key === "ArrowRight") focus(i + 1);
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (pasted) {
              onChange(pasted);
              focus(pasted.length);
            }
          }}
          className="size-12 rounded-xl border border-input bg-input/30 text-center text-lg font-semibold outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      ))}
    </div>
  );
}
