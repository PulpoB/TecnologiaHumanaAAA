import { useState, useEffect } from "react";
import {
  User, Mail, Phone, MapPin, Calendar, BookOpen, Bell, Shield,
  Edit3, Save, X, ChevronRight, GraduationCap, Clock, Check, LogOut
} from "lucide-react";

interface NotifSetting { label: string; description: string; enabled: boolean }

const API_URL = "http://localhost:3001/api";

interface ProfileProps {
  user?: { id: string; name: string; role: string };
  onLogout?: () => void;
}

export function Profile({ user, onLogout }: ProfileProps) {
  const [activeTab, setActiveTab] = useState<"personal" | "academic" | "settings">("personal");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    bio: "",
  });
  const [draft, setDraft] = useState(form);

  const [notifs, setNotifs] = useState<NotifSetting[]>([
    { label: "Tareas próximas a vencer", description: "Notificación 24 horas antes del vencimiento", enabled: true },
    { label: "Nuevos materiales", description: "Cuando el docente suba recursos nuevos", enabled: true },
    { label: "Calificaciones publicadas", description: "Al recibir una nueva calificación", enabled: true },
    { label: "Recordatorios de entrega", description: "1 hora antes de la fecha límite", enabled: false },
    { label: "Anuncios del docente", description: "Mensajes generales del grupo", enabled: true },
  ]);

  useEffect(() => {
    if (!user?.id) return;
    console.log(">>> [Frontend] Solicitando datos del perfil al servidor...");
    fetch(`${API_URL}/profile?userId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        console.log(">>> [Frontend] Datos recibidos de la DB:", data);
        const profileData = {
          name: data.name,
          email: data.email,
          phone: data.phone || "",
          city: data.city || "",
          bio: data.bio || "",
        };
        setForm(profileData);
        setDraft(profileData);
        setLoading(false);
      })
      .catch(err => {
        console.error("XXX [Frontend] Error al cargar perfil:", err);
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    console.log(">>> [Frontend] Intentando persistir cambios en la DB...", draft);
    try {
      const res = await fetch(`${API_URL}/profile?userId=${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      if (res.ok) {
        console.log("vvv [Frontend] ¡Cambios guardados con éxito!");
        setForm(draft);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error("XXX [Frontend] Error al guardar el perfil:", err);
    }
  };

  const handleCancel = () => {
    setDraft(form);
    setEditing(false);
  };

  const toggleNotif = (i: number) => {
    setNotifs((prev) => prev.map((n, idx) => idx === i ? { ...n, enabled: !n.enabled } : n));
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground italic">Cargando perfil desde la base de datos...</div>;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600" />
        <div className="px-6 pb-5">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center border-4 border-card shadow-md">
              <span className="text-white text-2xl font-semibold">CR</span>
            </div>
            <button
              onClick={() => (editing ? handleSave() : setEditing(true))}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl transition-all ${
                editing
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-accent text-foreground hover:bg-accent/60 border border-border"
              }`}
            >
              {editing ? <><Save size={14} /> Guardar</> : <><Edit3 size={14} /> Editar</>}
            </button>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-foreground">{form.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Ingeniería en Sistemas Computacionales • 6° Semestre</p>
              <p className="text-xs text-muted-foreground mt-1">Matrícula: 2021-ISC-4782 • UNAM</p>
            </div>
            {saved && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs rounded-lg">
                <Check size={13} /> Cambios guardados
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {(["personal", "academic", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs rounded-lg transition-all ${
              activeTab === tab ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "personal" ? "Datos Personales" : tab === "academic" ? "Información Académica" : "Configuración"}
          </button>
        ))}
      </div>

      {/* Personal tab */}
      {activeTab === "personal" && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
          <h3 className="text-sm flex items-center gap-2">
            <User size={15} className="text-primary" /> Datos personales
          </h3>

          <div className="grid lg:grid-cols-2 gap-4">
            {[
              { label: "Nombre completo", key: "name", icon: User },
              { label: "Correo institucional", key: "email", icon: Mail },
              { label: "Teléfono", key: "phone", icon: Phone },
              { label: "Ciudad", key: "city", icon: MapPin },
            ].map(({ label, key, icon: Icon }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                  <Icon size={12} /> {label}
                </label>
                {editing ? (
                  <input
                    value={draft[key as keyof typeof draft]}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <p className="text-sm text-foreground px-3 py-2 bg-muted/50 rounded-lg">{form[key as keyof typeof form]}</p>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Descripción breve</label>
            {editing ? (
              <textarea
                value={draft.bio}
                onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            ) : (
              <p className="text-sm text-foreground px-3 py-2 bg-muted/50 rounded-lg leading-relaxed">{form.bio}</p>
            )}
          </div>

          {editing && (
            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2">
                <Save size={14} /> Guardar cambios
              </button>
              <button onClick={handleCancel} className="px-4 py-2 border border-border text-foreground text-sm rounded-xl hover:bg-accent transition-colors flex items-center gap-2">
                <X size={14} /> Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Academic tab */}
      {activeTab === "academic" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h3 className="text-sm flex items-center gap-2 mb-4">
              <GraduationCap size={15} className="text-primary" /> Información académica
            </h3>
            <div className="grid lg:grid-cols-2 gap-4">
              {[
                { label: "Carrera", value: "Ingeniería en Sistemas Computacionales", icon: BookOpen },
                { label: "Semestre actual", value: "6° Semestre", icon: Calendar },
                { label: "Promedio acumulado", value: "8.64 / 10.0", icon: GraduationCap },
                { label: "Créditos cursados", value: "172 / 240", icon: ChevronRight },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Icon size={16} className="text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm text-foreground font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h3 className="text-sm flex items-center gap-2 mb-4">
              <BookOpen size={15} className="text-primary" /> Asignaturas inscritas
            </h3>
            <div className="space-y-2">
              {[
                { name: "Programación Web", teacher: "Ing. Carlos López", color: "#2563EB", hours: "4h/sem" },
                { name: "Economía Internacional", teacher: "Dr. Roberto Martínez", color: "#8B5CF6", hours: "3h/sem" },
                { name: "Química Orgánica", teacher: "Dra. Ana García", color: "#10B981", hours: "3h/sem" },
                { name: "Historia Moderna", teacher: "Mtra. Patricia Hernández", color: "#F59E0B", hours: "2h/sem" },
                { name: "Cálculo III", teacher: "Dr. Miguel Flores", color: "#EF4444", hours: "5h/sem" },
                { name: "Estadística Aplicada", teacher: "Mtro. Juan Reyes", color: "#06B6D4", hours: "3h/sem" },
              ].map((s) => (
                <div key={s.name} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-colors">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.teacher}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={11} /> {s.hours}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings tab */}
      {activeTab === "settings" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h3 className="text-sm flex items-center gap-2 mb-4">
              <Bell size={15} className="text-primary" /> Notificaciones
            </h3>
            <div className="space-y-3">
              {notifs.map((n, i) => (
                <div key={n.label} className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{n.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                  </div>
                  <button
                    onClick={() => toggleNotif(i)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${n.enabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${n.enabled ? "translate-x-5.5" : "translate-x-0.5"}`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h3 className="text-sm flex items-center gap-2 mb-4">
              <Shield size={15} className="text-primary" /> Seguridad
            </h3>
            <div className="space-y-2">
              {["Cambiar contraseña", "Verificación en dos pasos", "Sesiones activas", "Descargar mis datos"].map((item) => (
                <button
                  key={item}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent/30 transition-colors text-left"
                >
                  <span className="text-sm text-foreground">{item}</span>
                  <ChevronRight size={15} className="text-muted-foreground" />
                </button>
              ))}
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-red-50 text-red-600 transition-colors text-left group"
              >
                <div className="flex items-center gap-2">
                  <LogOut size={15} className="group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">Cerrar Sesión</span>
                </div>
                <ChevronRight size={15} className="text-red-300" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
