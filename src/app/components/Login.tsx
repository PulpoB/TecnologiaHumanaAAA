import { useState } from "react";
import { User, Lock, GraduationCap, AlertCircle, ArrowRight } from "lucide-react";

const API_URL = "http://localhost:3001/api";

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Guardamos en localStorage para persistencia básica
        localStorage.setItem("user", JSON.stringify(data));
        onLoginSuccess(data);
      } else {
        setError(data.error || "Credenciales inválidas");
      }
    } catch (err) {
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-card w-full max-w-md p-8 rounded-3xl shadow-xl border border-border">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">EduCampus</h1>
          <p className="text-sm text-muted-foreground mt-1">Ingresa a tu plataforma de e-learning</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground ml-1">Correo Institucional</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                placeholder="correo@universidad.edu.mx"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground ml-1">Contraseña</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-lg">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? "Iniciando sesión..." : <><ArrowRight size={16} /> Entrar a la plataforma</>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-center text-muted-foreground mb-4">Accesos rápidos de prueba:</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => quickLogin('carlos.ramirez@universidad.edu.mx', 'hash123')} className="p-2 bg-blue-50 text-blue-700 text-[10px] rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">Entrar como Estudiante</button>
            <button onClick={() => quickLogin('c.lopez@universidad.edu.mx', 'hash456')} className="p-2 bg-purple-50 text-purple-700 text-[10px] rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors">Entrar como Profesor</button>
          </div>
        </div>
      </div>
    </div>
  );
}