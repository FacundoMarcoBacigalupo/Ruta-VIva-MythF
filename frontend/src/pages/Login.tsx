import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/api/endpoints";
import { useAuth } from "@/store/auth";
import { Spinner } from "@/components/ui/Spinner";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useMeta } from "@/hooks/useMeta";

export function Login() {
  useMeta({ title: "Ingresar", noindex: true });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuth((s) => s.setAuth);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      setAuth(res.access_token, res.user);
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">Ingresar</h1>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Contraseña</label>
          <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-primary w-full">
          {loading ? <><Spinner className="mr-2" /> Ingresando…</> : "Ingresar"}
        </button>
        <p className="text-sm text-brand-500 text-center">
          ¿No tenés cuenta? <Link to="/registro" className="text-ink-900 font-semibold">Crear una</Link>
        </p>
      </form>
    </div>
  );
}
