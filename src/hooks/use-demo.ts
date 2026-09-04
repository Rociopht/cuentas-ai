import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * "Modo demo" resuelto por estado global (la sesión), no por la URL ni por
 * navegación interna: entrar directo a cualquier ruta también lo detecta.
 */
export function useDemoMode() {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let alive = true;
    const read = async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      const email = u?.email ?? "";
      const flagged = Boolean((u?.user_metadata as { is_demo?: boolean } | undefined)?.is_demo);
      if (alive) setIsDemo(flagged || email === "demo@cuentas.ai" || email.startsWith("demo-"));
    };
    void read();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void read());
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return isDemo;
}
