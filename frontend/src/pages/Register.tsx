import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/api/endpoints";
import { useAuth } from "@/store/auth";
import { Spinner } from "@/components/ui/Spinner";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useMeta } from "@/hooks/useMeta";

export function Register() {
  useMeta({ title: "Crear cuenta", noindex: true });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"consumer" | "fleet_admin">("consumer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuth((s) => s.setAuth);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.register({
        email,
        password,
        full_name: fullName || undefined,
        role
      });
      setAuth(res.access_token, res.user);
      navigate(role === "fleet_admin" ? "/dashboard" : "/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">Crear cuenta</h1>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <div>
          <label className="label">Nombre completo (opcional)</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Contraseña (mín. 10, mayúscula, minúscula y dígito)</label>
          <PasswordInput required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className="label">Tipo de cuenta</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as "consumer" | "fleet_admin")}>
            <option value="consumer">Personal</option>
            <option value="fleet_admin">Empresa / Flota</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-primary w-full">
          {loading ? <><Spinner className="mr-2" /> Creando…</> : "Crear cuenta"}
        </button>
        <p className="text-sm text-brand-500 text-center">
          ¿Ya tenés cuenta? <Link to="/login" className="text-ink-900 font-semibold">Ingresar</Link>
        </p>
      </form>
    </div>
  );
}
