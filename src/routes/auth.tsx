import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { authErrorMessage, passwordProblem, emailProblem } from "@/lib/auth-errors";
import { startDemoSession } from "@/lib/demo.functions";

type Search = { demo?: string };

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({ demo: s.demo as string | undefined }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const pwdHint = mode === "signup" ? passwordProblem(password) : null;
  const emailHint = emailProblem(email);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  useEffect(() => {
    if (search.demo === "1") void handleDemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDemo() {
    setFormError(null);
    setDemoLoading(true);
    try {
      // Sin signUp desde el navegador: el servidor entrega un token de un solo uso
      // para la única cuenta demo compartida.
      const { tokenHash } = await startDemoSession();
      const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
      if (error) throw error;
      toast.success("Demo lista, con datos de ejemplo cargados.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = authErrorMessage(err);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setDemoLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setFormError(null);

    if (emailHint) { setFormError(emailHint); return; }
    if (mode === "signup" && (pwdHint || password.length < 8)) {
      setFormError(pwdHint ?? "La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        // Si el proyecto pide confirmar email, no hay sesión: lo decimos claramente.
        if (!data.session) {
          const signIn = await supabase.auth.signInWithPassword({ email, password });
          if (signIn.error) {
            setFormError("Creamos tu cuenta. Confirma tu email con el enlace que te enviamos y luego ingresa.");
            setMode("signin");
            return;
          }
        }
        toast.success("Bienvenido a Cuentas AI.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const msg = authErrorMessage(err);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || demoLoading;

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-foreground/15 font-bold">C</div>
          <span className="font-semibold">Cuentas AI</span>
        </Link>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">La fuente única de verdad de tus alquileres.</h2>
          <p className="mt-3 max-w-md text-primary-foreground/80">Cobros, pagos, gastos y rentabilidad en un solo lugar. Sin comisiones, sin depender de terceros.</p>
        </div>
        <p className="text-sm text-primary-foreground/60">© {new Date().getFullYear()} Cuentas AI</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 md:hidden">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">C</div>
              <span className="font-semibold">Cuentas AI</span>
            </Link>
          </div>

          <h1 className="text-2xl font-semibold">
            {mode === "signup" ? "Crea tu cuenta" : "Bienvenido de vuelta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup" ? "Empieza a gestionar tus alquileres en minutos." : "Ingresa a tu panel."}
          </p>

          {formError && (
            <div role="alert" className="mt-4 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                aria-invalid={Boolean(touched && emailHint)}
              />
              {touched && emailHint && <p className="text-xs text-destructive">{emailHint}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  aria-invalid={Boolean(pwdHint)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === "signup" && (
                <p className={"text-xs " + (pwdHint ? "text-destructive" : "text-muted-foreground")}>
                  {pwdHint ?? "Mínimo 8 caracteres, con letras y números."}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Crear cuenta" : "Ingresar"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> o <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleDemo} disabled={busy}>
            {demoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Ver demo con datos de ejemplo
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">El demo usa una cuenta compartida de solo ejemplo.</p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "¿Ya tienes cuenta?" : "¿Nuevo aquí?"}{" "}
            <button
              type="button"
              className="font-medium text-foreground underline-offset-4 hover:underline"
              onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setFormError(null); setTouched(false); }}
            >
              {mode === "signup" ? "Ingresar" : "Crear cuenta"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
