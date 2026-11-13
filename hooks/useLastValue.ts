"use client";

import { useState } from "react";

/**
 * The value, or while it is empty the last one it held. A details dialog draws from this and takes its
 * visibility from the value itself, so it keeps showing its record while it fades out instead of shrinking to
 * nothing as the parent clears it (the snap on closing; the user, 29 Oct 2026). React's pattern for state that
 * follows a prop: set during render, only when it changed.
 */
export function useLastValue<T>(value: T | null | undefined): T | null {
  const [last, setLast] = useState<T | null>(value ?? null);
  if (value != null && value !== last) setLast(value);
  return value ?? last;
}
