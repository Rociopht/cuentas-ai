import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  useEffect(() => {
    if (search.demo === "1" && !loading) {
      void handleDemo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDemo() {
    setLoading(true);
    const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const demoEmail = `demo-${stamp}@cuentas.ai`;
    const demoPass = `Zx9$${stamp}${crypto.randomUUID().slice(0, 8)}Q!`;
    const { error } = await supabase.auth.signUp({
      email: demoEmail,
      password: demoPass,
      options: { emailRedirectTo: window.location.origin, data: { full_name: "Propietario Demo" } },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    // Auto sign-in in case session isn't returned on signup
    if (!(await supabase.auth.getSession()).data.session) {
      await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass });
    }
    toast.success("Cuenta demo lista. Datos precargados.");
    navigate({ to: "/dashboard" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
      });
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success("Bienvenido a Cuentas AI.");
      navigate({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); setLoading(false); return; }
      navigate({ to: "/dashboard" });
    }
  }

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

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Crear cuenta" : "Ingresar"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> o <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleDemo} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Ver demo con datos reales
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "¿Ya tienes cuenta?" : "¿Nuevo aquí?"}{" "}
            <button className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
              {mode === "signup" ? "Ingresar" : "Crear cuenta"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}