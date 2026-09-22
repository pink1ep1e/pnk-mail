"use client";

import { useEffect } from "react";

/** Registers the PWA service worker (offline shell). */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        try {
          void reg.update();
        } catch {
          /* ignore */
        }
      })
      .catch(() => undefined);
  }, []);

  return null;
}
