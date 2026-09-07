export type HapticKind = "light" | "medium" | "success";

/** Short vibration for mobile tap feedback. No-ops if unsupported. */
export function haptic(kind: HapticKind = "light") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }
  try {
    if (kind === "light") navigator.vibrate(10);
    else if (kind === "medium") navigator.vibrate(18);
    else navigator.vibrate([10, 40, 14]);
  } catch {
    // ignore
  }
}
