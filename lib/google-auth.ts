/** Browser OAuth flow; the server still enforces identity and row ownership. */
export type GoogleAuthClient = {
  signInWithOAuth: (options: {
    provider: "google";
    options: { redirectTo: string; queryParams: { prompt: string } };
  }) => Promise<{ error: unknown }>;
  exchangeCodeForSession: (
    code: string,
  ) => Promise<{ data: { session: unknown }; error: unknown }>;
};
export async function startGoogleLogin(
  auth: GoogleAuthClient,
  origin: string,
): Promise<void> {
  try {
    const { error } = await auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: new URL("/auth/callback", origin).href,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw error;
  } catch {
    throw new Error(
      "No se pudo iniciar el acceso con Google. Revisá la conexión e intentá nuevamente.",
    );
  }
}
// React Strict Mode can mount effects twice; an OAuth code is single-use.
const pending = new WeakMap<GoogleAuthClient, Map<string, Promise<void>>>();
export async function completeGoogleCallback(
  auth: GoogleAuthClient,
  href: string,
): Promise<void> {
  const url = new URL(href);
  if (url.searchParams.has("error"))
    throw new Error(
      url.searchParams.get("error") === "access_denied"
        ? "El acceso con Google fue cancelado. Podés intentarlo de nuevo o seguir sin cuenta."
        : "Google no pudo completar el acceso. Intentá nuevamente.",
    );
  const code = url.searchParams.get("code");
  if (!code)
    throw new Error(
      "No se recibió el código de acceso. Volvé a iniciar sesión.",
    );
  let exchanges = pending.get(auth);
  if (!exchanges) {
    exchanges = new Map();
    pending.set(auth, exchanges);
  }
  let exchange = exchanges.get(code);
  if (!exchange) {
    exchange = (async () => {
      try {
        const { data, error } = await auth.exchangeCodeForSession(code);
        if (error || !data.session) throw error;
      } catch {
        throw new Error(
          "No se pudo completar la sesión. El enlace puede haber vencido; volvé a ingresar desde este navegador.",
        );
      }
    })();
    exchanges.set(code, exchange);
  }
  await exchange;
}
