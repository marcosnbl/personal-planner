"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import { completeGoogleCallback } from "@/lib/google-auth";
export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function finish() {
      try {
        const client = getSupabase();
        if (!client)
          throw new Error(
            "No está configurada la conexión con Supabase. Podés continuar sin cuenta.",
          );
        await completeGoogleCallback(client.auth, window.location.href);
        if (active) router.replace("/");
      } catch (error) {
        if (!active) return;
        // Strip the one-time code and provider error details from browser history.
        window.history.replaceState(null, "", "/auth/callback");
        setError(
          error instanceof Error
            ? error.message
            : "No se pudo completar el acceso.",
        );
      }
    }
    void finish();
    return () => {
      active = false;
    };
  }, [router]);
  return (
    <main className="auth-callback">
      <section className="auth-callback-card">
        <span className="eyebrow">TRAINING PLANNER</span>
        <h1>
          {error ? "No pudimos completar el acceso" : "Completando tu sesión"}
        </h1>
        <p role={error ? "alert" : "status"}>
          {error || "Estamos confirmando tu acceso con Google…"}
        </p>
        {error && (
          <Link className="secondary-button" href="/">
            Volver al planificador
          </Link>
        )}
      </section>
    </main>
  );
}
