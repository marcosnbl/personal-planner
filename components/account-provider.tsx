"use client";
/* Hydrate the browser-only session after SSR; database permissions enforce ownership. */
/* eslint-disable react-hooks/set-state-in-effect */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
type Account = {
  client: SupabaseClient | null;
  user: User | null;
  ready: boolean;
  error: string;
};
const Context = createContext<Account>({
  client: null,
  user: null,
  ready: false,
  error: "",
});
export const useAccount = () => useContext(Context);
export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account>({
    client: null,
    user: null,
    ready: false,
    error: "",
  });
  useEffect(() => {
    let active = true;
    let eventSeen = false;
    let client: SupabaseClient | null;
    try {
      client = getSupabase();
    } catch {
      setAccount({
        client: null,
        user: null,
        ready: true,
        error: "La configuración de Supabase no es válida. Revisá .env.local.",
      });
      return;
    }
    if (!client) {
      setAccount({ client: null, user: null, ready: true, error: "" });
      return;
    }
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      eventSeen = true;
      if (active)
        setAccount({
          client,
          user: session?.user ?? null,
          ready: true,
          error: "",
        });
    });
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (active && !eventSeen)
          setAccount({
            client,
            user: data.session?.user ?? null,
            ready: true,
            error: error
              ? "No se pudo recuperar la sesión. Iniciá sesión nuevamente."
              : "",
          });
      })
      .catch(() => {
        if (active && !eventSeen)
          setAccount({
            client,
            user: null,
            ready: true,
            error: "No se pudo recuperar la sesión.",
          });
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  return <Context.Provider value={account}>{children}</Context.Provider>;
}
