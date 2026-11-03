"use client";
import { useEffect, useState } from "react";
import { useAccount } from "./account-provider";
import { startGoogleLogin } from "@/lib/google-auth";
export function AccountPanel({
  pending,
  onContinueGuest,
}: {
  pending: boolean;
  onContinueGuest: () => void;
}) {
  const { client, user, error } = useAccount();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const restore = () => setBusy(false);
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  async function signIn() {
    if (!client || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await startGoogleLogin(client.auth, window.location.origin);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar el acceso.",
      );
      setBusy(false);
    }
  }
  async function signOut() {
    if (!client || busy) return;
    if (
      pending &&
      !window.confirm(
        "Hay cambios pendientes de sincronizar. Se conservarán en la copia local de esta cuenta, pero aún no estarán en otros dispositivos. ¿Cerrar sesión?",
      )
    )
      return;
    setBusy(true);
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
    } catch {
      setMessage("No se pudo cerrar la sesión. Intentá nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-panel">
      <h3>Tu entrenamiento, en cualquier dispositivo</h3>
      {error && <p role="alert">{error}</p>}
      {user ? (
        <>
          <p>
            Sesión iniciada como <strong>{user.email}</strong>.
          </p>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={signOut}
          >
            Cerrar sesión en este dispositivo
          </button>
        </>
      ) : (
        <>
          <p>
            Continuá con Google para guardar tus entrenamientos en tu cuenta y
            verlos desde el celular o la computadora.
          </p>
          <div className="account-actions">
            <button
              type="button"
              className="google-signin"
              disabled={!client || busy}
              onClick={signIn}
            >
              <svg
                viewBox="0 0 48 48"
                width="20"
                height="20"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.84 23.84 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
                />
              </svg>
              {busy ? "Redirigiendo a Google…" : "Continuar con Google"}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={onContinueGuest}
            >
              Probar sin cuenta
            </button>
          </div>
          <p className="settings-note">
            Sin cuenta, tus datos quedan únicamente en este navegador. Podés
            copiarlos a tu cuenta cuando inicies sesión.
          </p>
          {!client && (
            <p className="settings-note">
              El acceso con Google estará disponible cuando se configure
              Supabase en este entorno.
            </p>
          )}
        </>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
