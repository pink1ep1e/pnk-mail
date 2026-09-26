"use client";

import { OfflineScreen } from "@/components/shared/offline-screen";
import { useEffect, useState } from "react";

function readOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

const CURRENT_CACHE = "pnk-mail-offline-v9";

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [offline, setOffline] = useState(readOffline);

  useEffect(() => {
    const boot = document.getElementById("offline-boot");
    const sync = () => {
      setOffline(!navigator.onLine);
      if (boot) boot.hidden = true;
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        void reg.update();
        if ("caches" in window) {
          void caches.keys().then((keys) =>
            Promise.all(
              keys
                .filter(
                  (k) =>
                    k.startsWith("pnk-mail-offline-") && k !== CURRENT_CACHE,
                )
                .map((k) => caches.delete(k)),
            ),
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {children}
      {offline ? <OfflineScreen /> : null}
    </>
  );
}
