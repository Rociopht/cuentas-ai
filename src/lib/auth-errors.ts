/** Traduce cualquier error de autenticación a un mensaje accionable en español. */
export function authErrorMessage(error: unknown): string {
  const raw = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : String(error ?? "");
  const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
  const m = raw.toLowerCase();

  if (code === "weak_password" || m.includes("pwned") || m.includes("weak password")) {
    return "Esa contraseña es muy común o apareció en filtraciones. Elige otra más larga, mezclando letras, números y un símbolo.";
  }
  if (m.includes("password should be at least") || m.includes("at least 6 characters")) {
    return "La contraseña es demasiado corta. Usa al menos 8 caracteres.";
  }
  if (code === "user_already_exists" || m.includes("already registered") || m.includes("already been registered")) {
    return "Ya existe una cuenta con este email. Ingresa con tu contraseña o recupérala.";
  }
  if (code === "invalid_credentials" || m.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos. Revisa e inténtalo de nuevo.";
  }
  if (code === "email_not_confirmed" || m.includes("email not confirmed")) {
    return "Tu email todavía no está confirmado. Revisa tu bandeja y abre el enlace que te enviamos.";
  }
  if (m.includes("invalid email") || m.includes("unable to validate email")) {
    return "Ese email no parece válido. Revisa que esté bien escrito.";
  }
  if (code === "over_email_send_rate_limit" || m.includes("rate limit") || m.includes("too many requests")) {
    return "Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.";
  }
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed")) {
    return "No pudimos conectarnos. Revisa tu internet e inténtalo otra vez.";
  }
  return raw || "Algo salió mal. Inténtalo de nuevo en un momento.";
}

/** Validación en tiempo real, antes de llamar al backend. */
export function passwordProblem(password: string): string | null {
  if (password.length === 0) return null;
  if (password.length < 8) return `Te faltan ${8 - password.length} caracteres (mínimo 8).`;
  if (!/[a-zA-Z]/.test(password)) return "Incluye al menos una letra.";
  if (!/[0-9]/.test(password)) return "Incluye al menos un número.";
  return null;
}

export function emailProblem(email: string): string | null {
  if (email.length === 0) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Escribe un email válido, por ejemplo tu@correo.com.";
  return null;
}
