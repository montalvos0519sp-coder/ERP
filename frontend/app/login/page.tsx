"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

import { api, setTokens } from "@/lib/api";
import { useUser } from "@/lib/UserContext";

export default function LoginPage() {
  const router = useRouter();
  const { reload } = useUser();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(username, password);
      setTokens(res.access, res.refresh);
      // Refresca el contexto de usuario CON el token recien guardado antes de
      // navegar. El UserProvider vive en el layout y no se remonta en una
      // navegacion de cliente, asi que sin esto `user` seguiria null y el
      // DashboardShell rebotaria de vuelta a /login (bucle / parpadeo).
      await reload();
      // Respeta la ruta a la que el usuario intentaba entrar antes del login.
      let returnTo = "/";
      try {
        const saved = window.sessionStorage.getItem("erp.return-to");
        if (saved && !saved.startsWith("/login")) returnTo = saved;
        window.sessionStorage.removeItem("erp.return-to");
      } catch { /* */ }
      router.replace(returnTo);
    } catch (err) {
      setError((err as Error).message || "Credenciales invalidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-3xl opacity-30 bg-[#1A73E8]" />
      <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full blur-3xl opacity-25 bg-[#34A853]" />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md mx-4 bg-[#0F172A]/80 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      >
        <div className="flex justify-center mb-6">
          <div
            className="logo-glow w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl"
            style={{ background: "linear-gradient(135deg, #1A73E8 0%, #34A853 100%)" }}
          >
            <LogIn className="w-8 h-8" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white text-center mb-1">ERP Profesional</h1>
        <p className="text-sm text-slate-400 text-center mb-8">Inicia sesion con tu cuenta</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            {error}
          </div>
        )}

        <label className="block mb-4">
          <span className="text-xs font-semibold text-slate-400 mb-1.5 block">Usuario</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            className="w-full bg-[#1E293B]/60 border border-white/[0.05] text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#14B8A6]/50 focus:shadow-[0_0_15px_rgba(20,184,166,0.15)]"
          />
        </label>

        <label className="block mb-6">
          <span className="text-xs font-semibold text-slate-400 mb-1.5 block">Contrasena</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-[#1E293B]/60 border border-white/[0.05] text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#14B8A6]/50 focus:shadow-[0_0_15px_rgba(20,184,166,0.15)]"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-white font-semibold shadow-lg disabled:opacity-50 transition-all hover:shadow-xl"
          style={{ background: "linear-gradient(90deg, #1A73E8 0%, #34A853 100%)" }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-[11px] text-slate-500 text-center mt-6">
          Default: admin / admin12345 (correr <code className="text-emerald-400">python manage.py bootstrap</code>)
        </p>
      </form>
    </div>
  );
}
