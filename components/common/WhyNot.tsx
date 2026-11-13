"use client";

import React, { useRef } from "react";
import { Tooltip } from "primereact/tooltip";

/**
 * Says why a greyed button cannot be used now, on hover, from a wrapper React owns.
 *
 * Never PrimeReact's `tooltipOptions.showOnDisabled`: to reach a disabled button it wraps the button in a new
 * `<div>` outside React (`parentNode.insertBefore(wrapper, target)`), so when React next removes or swaps that
 * button it looks under the old parent and the page dies with "Failed to execute 'removeChild' on 'Node'" (the
 * user's crash on saving a KYC draft, 28 Oct 2026). Here the span is always rendered, so the button never moves,
 * and the tooltip hangs on the span, which still gets the hover a disabled button swallows.
 */
export default function WhyNot({ why, position = "top", children }: { why?: string | null; position?: "top" | "bottom" | "left" | "right"; children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span ref={ref} className={`inline-flex ${why ? "cursor-not-allowed" : ""}`}>
      {children}
      {why && <Tooltip target={ref as React.RefObject<HTMLElement>} content={why} position={position} />}
    </span>
  );
}
