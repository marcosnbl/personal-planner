"use client";

import { useEffect, useState } from "react";
import {
  loadWorkoutEditor,
  loadMoveDialog,
  loadTrainingStatistics,
  loadAccountPanel,
} from "./deferred-views";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

async function cacheDeferredViews(cache: Cache) {
  const views = await Promise.allSettled([
    loadWorkoutEditor(),
    loadMoveDialog(),
    loadTrainingStatistics(),
    loadAccountPanel(),
  ]);

  const assets = performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter(
      (url) =>
        new URL(url).origin === location.origin &&
        new URL(url).pathname.startsWith("/_next/static/"),
    );

  const resources = await Promise.allSettled(
    [...new Set(assets)].map((asset) => cache.add(asset)),
  );
  return [...views, ...resources].every(
    (result) => result.status === "fulfilled",
  );
}

export function InstallApp({ compact = false }: { compact?: boolean }) {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;
    let preparing = false;
    let prepared = false;
    let retryRequested = false;

    const prepare = async () => {
      if (cancelled || preparing || prepared || !navigator.onLine) return;
      preparing = true;
      try {
        await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const assets = Array.from(
          document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
            'script[src],link[rel="stylesheet"]',
          ),
        )
          .map((node) =>
            node instanceof HTMLScriptElement ? node.src : node.href,
          )
          .filter(
            (url) =>
              new URL(url).origin === location.origin &&
              new URL(url).pathname.startsWith("/_next/static/"),
          );
        const cache = await caches.open("training-planner-shell-v2");

        await cache.addAll(assets);
        if (cancelled) return;
        if (!(await cacheDeferredViews(cache)) || cancelled) return;
        await cache.put(
          "/_offline/ready",
          new Response(
            JSON.stringify({
              views: ["editor", "move", "statistics", "account"],
            }),
          ),
        );
        prepared = true;
      } catch {
        // A later online event retries failed imports and cache writes.
      } finally {
        preparing = false;
        if (retryRequested && !prepared && !cancelled) {
          retryRequested = false;
          schedule();
        }
      }
    };

    const schedule = () => {
      if (cancelled || prepared) return;
      if (preparing) {
        retryRequested = true;
        return;
      }
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(
          () => {
            void prepare();
          },
          { timeout: 10000 },
        );
      } else {
        timeoutHandle = window.setTimeout(() => {
          void prepare();
        }, 1000);
      }
    };
    const supportsOffline =
      process.env.NODE_ENV === "production" && "serviceWorker" in navigator;
    if (supportsOffline) {
      schedule();
      window.addEventListener("online", schedule);
    }
    // The installed display mode is only available in the browser after SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);

    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };

    const done = () => {
      setInstalled(true);
      setInstall(null);
    };

    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", done);

    return () => {
      cancelled = true;
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
      window.removeEventListener("online", schedule);
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  if (compact && !install) return null;
  if (installed)
    return (
      <p className="install-help">Aplicación instalada en este dispositivo.</p>
    );
  return install ? (
    <button
      className="secondary-button install-button"
      onClick={async () => {
        await install.prompt();
        await install.userChoice;
        setInstall(null);
      }}
    >
      Instalar aplicación
    </button>
  ) : (
    <p className="install-help">
      Para instalar: abrí el menú del navegador y elegí «Instalar aplicación» o
      «Agregar a pantalla de inicio». En iPhone: Safari → Compartir → Agregar a
      inicio. Requiere HTTPS y la versión de producción.
    </p>
  );
}
