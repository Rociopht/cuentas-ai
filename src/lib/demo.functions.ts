import { createServerFn } from "@tanstack/react-start";

/**
 * Acceso al demo, 100% server-side.
 *
 * Antes: el navegador llamaba `supabase.auth.signUp()` con email/password random,
 * así que cualquiera podía crear miles de cuentas con un script usando la anon key
 * del bundle. Ahora existe UNA sola cuenta demo compartida; el servidor genera un
 * token de sesión de un solo uso para esa cuenta y aplica rate limiting por IP.
 * Ningún clic crea usuarios nuevos.
 */

const DEMO_EMAIL = "demo@cuentas.ai";
const WINDOW_MINUTES = 10;
const MAX_PER_WINDOW = 8;

async function clientIp(): Promise<string> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const h = getRequest().headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    (h.get("x-forwarded-for") ?? "unknown").split(",")[0]!.trim()
  );
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`cuentas-ai-demo:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const startDemoSession = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const ipHash = await hashIp(await clientIp());
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { count } = await supabaseAdmin
    .from("demo_access_log")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if ((count ?? 0) >= MAX_PER_WINDOW) {
    throw new Error(`Demasiados intentos de demo. Espera ${WINDOW_MINUTES} minutos e inténtalo de nuevo.`);
  }

  await supabaseAdmin.from("demo_access_log").insert({ ip_hash: ipHash });

  // Genera un token de un solo uso para la cuenta demo existente.
  let link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: DEMO_EMAIL });

  if (link.error || !link.data?.properties?.hashed_token) {
    // Primera vez: crea la única cuenta demo (el trigger siembra sus datos).
    const password = `Dm-${crypto.randomUUID()}-${crypto.randomUUID()}`;
    const created = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Propietario Demo", is_demo: true },
    });
    if (created.error && !/already/i.test(created.error.message)) {
      throw new Error("No pudimos abrir el demo ahora mismo. Inténtalo en un momento.");
    }
    link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: DEMO_EMAIL });
  }

  const tokenHash = link.data?.properties?.hashed_token;
  if (!tokenHash) throw new Error("No pudimos abrir el demo ahora mismo. Inténtalo en un momento.");

  return { email: DEMO_EMAIL, tokenHash };
});
