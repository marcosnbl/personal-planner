"use client";
import { useEffect, useState } from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function InstallApp({ compact = false }: { compact?: boolean }) {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js")
        .then(async () => {
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
          const cache = await caches.open("training-planner-shell-v1");
          await cache.addAll(assets);
        })
        .catch(() => {});
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
