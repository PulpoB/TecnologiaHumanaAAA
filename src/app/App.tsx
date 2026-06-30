import { useState, useEffect } from "react";
import type { ElementType } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  LayoutDashboard, FileText, BookOpen, BarChart2, User,
  GraduationCap, Menu, X, ChevronRight, Bell, LogOut
} from "lucide-react";

import { Dashboard } from "./components/Dashboard";
import { Tasks } from "./components/Tasks";
import { Materials } from "./components/Materials";
import { Grades } from "./components/Grades";
import { Profile } from "./components/Profile";
import { Login } from "./components/Login";
import { AdminPanel } from "./components/AdminPanel";

/* MARKER-MAKE-KIT-INVOKED */

const API_URL = "http://localhost:3001/api";

type Page = "dashboard" | "notifications" | "tasks" | "task-detail" | "materials" | "grades" | "profile";

interface NavItem {
  id: Page;
  label: string;
  Icon: ElementType;
  badge?: number;
}

interface LoggedUser {
  id: string;
  name: string;
  email?: string;
  role: "student" | "teacher" | "admin";
  avatar_url?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "notifications", label: "Notificaciones", Icon: Bell },
  { id: "tasks", label: "Tareas", Icon: FileText },
  { id: "materials", label: "Materiales", Icon: BookOpen },
  { id: "grades", label: "Calificaciones", Icon: BarChart2 },
  { id: "profile", label: "Perfil", Icon: User },
];

function resolveTaskStatus(task: { status?: string; due_date?: string }) {
  if (task.status === "submitted") return "submitted";

  if (!task.due_date) return "pending";

  const now = Date.now();
  const dueTime = new Date(task.due_date).getTime();

  if (Number.isNaN(dueTime)) return "pending";

  if (dueTime < now) return "late";

  const oneDayMs = 24 * 60 * 60 * 1000;

  if (dueTime - now <= oneDayMs) return "due-soon";

  return "pending";
}

interface NotificationsPageProps {
  user: LoggedUser;
  notificationCount: number;
  onNavigate: (page: string, taskId?: string) => void;
}

function NotificationsPage({ user, notificationCount, onNavigate }: NotificationsPageProps) {
  const [browserPermission, setBrowserPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const activateBrowserAlerts = async () => {
    if (typeof Notification === "undefined") {
      alert("Tu navegador no soporta notificaciones.");
      return;
    }

    if (Notification.permission === "denied") {
      setBrowserPermission("denied");
      alert("Las notificaciones están bloqueadas. Presiona el candado junto a la URL, entra a permisos del sitio y permite las notificaciones.");
      return;
    }

    if (Notification.permission === "granted") {
      setBrowserPermission("granted");
      new Notification("Notificaciones activadas", {
        body: user.role === "teacher"
          ? "Te avisaremos cuando tengas solicitudes pendientes."
          : "Te avisaremos cuando tengas tareas próximas o vencidas.",
      });
      return;
    }

    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);

    if (permission === "granted") {
      new Notification("Notificaciones activadas", {
        body: user.role === "teacher"
          ? "Te avisaremos cuando tengas solicitudes pendientes."
          : "Te avisaremos cuando tengas tareas próximas o vencidas.",
      });
    } else if (permission === "denied") {
      alert("Las notificaciones quedaron bloqueadas. Presiona el candado junto a la URL y permite las notificaciones.");
    }
  };

  const isTeacher = user.role === "teacher";
  const hasNotifications = notificationCount > 0;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
      <div>
        <h1>Notificaciones</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {hasNotifications
            ? `${notificationCount} notificación(es) pendiente(s)`
            : "Sin notificaciones pendientes"}
        </p>
      </div>

      {hasNotifications ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Bell size={18} className="text-amber-600 mt-0.5" />

            <div>
              <p className="text-sm font-medium text-amber-900">
                {isTeacher ? "Solicitudes de plazo pendientes" : "Alerta de plazo"}
              </p>

              <p className="text-xs text-amber-700">
                {isTeacher
                  ? `Tienes ${notificationCount} solicitud(es) de más plazo pendiente(s) de revisar.`
                  : `Tienes ${notificationCount} tarea(s) vencidas o cerca de vencer. Revisa la tarea para pedir más plazo al profesor.`}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={activateBrowserAlerts}
              className="px-3 py-2 bg-white border border-amber-200 text-amber-700 text-xs rounded-lg hover:bg-amber-100"
            >
              Activar notificaciones
            </button>

            <button
              onClick={() => onNavigate("tasks")}
              className="px-3 py-2 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700"
            >
              Ver tareas
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-[260px] bg-card border border-border rounded-xl" />
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<LoggedUser | null>(() => {
    const saved = localStorage.getItem("user");

    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  const [page, setPage] = useState<Page>("dashboard");
  const [taskId, setTaskId] = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const handleLoginSuccess = (userData: LoggedUser) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setPage("dashboard");
    setTaskId(undefined);
    setNotificationCount(0);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setPage("dashboard");
    setTaskId(undefined);
    setNotificationCount(0);
  };

  const navigate = (p: string, tid?: string) => {
    setPage(p as Page);
    setTaskId(tid);
    setSidebarOpen(false);
  };

  const activeNavId = page === "task-detail" ? "tasks" : page;

  useEffect(() => {
    if (!user?.id) return;

    const loadNotificationCount = async () => {
      try {
        if (user.role === "student") {
          const res = await fetch(`${API_URL}/tasks?userId=${user.id}`);

          if (!res.ok) {
            setNotificationCount(0);
            return;
          }

          const data = await res.json();

          const count = data.filter((task: any) => {
            const status = resolveTaskStatus({
              status: task.status,
              due_date: task.due_date,
            });

            return status === "due-soon" || status === "late";
          }).length;

          setNotificationCount(count);
          return;
        }

        if (user.role === "teacher") {
          const res = await fetch(`${API_URL}/extension-requests?userId=${user.id}`);

          if (!res.ok) {
            setNotificationCount(0);
            return;
          }

          const data = await res.json();

          const count = data.filter((request: any) => request.status === "pending").length;

          setNotificationCount(count);
          return;
        }

        setNotificationCount(0);
      } catch (err) {
        console.error("Error cargando notificaciones:", err);
        setNotificationCount(0);
      }
    };

    loadNotificationCount();

    const interval = window.setInterval(loadNotificationCount, 30000);

    return () => window.clearInterval(interval);
  }, [user]);

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (user.role === "admin") {
    return <AdminPanel user={user} onLogout={handleLogout} />;
  }

  const initials = user.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const notificationNavBadge = notificationCount > 0 ? notificationCount : undefined;

  const navItemsWithBadge = NAV_ITEMS.map((item) => {
    if (item.id === "notifications") {
      return {
        ...item,
        badge: notificationNavBadge,
      };
    }

    return item;
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily: "var(--font-family)" }}>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-60 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200 lg:relative lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap size={17} className="text-white" />
            </div>

            <div>
              <span className="text-sm font-semibold text-sidebar-foreground">EduCampus</span>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">Universidad Nacional</p>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 overflow-y-auto">
            <p className="text-xs text-muted-foreground uppercase tracking-widest px-2 mb-2">
              Navegación
            </p>

            <ul className="space-y-0.5">
              {navItemsWithBadge.map(({ id, label, Icon, badge }) => {
                const isActive = activeNavId === id;

                return (
                  <li key={id}>
                    <button
                      onClick={() => navigate(id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                      }`}
                    >
                      <Icon
                        size={17}
                        className={isActive ? "text-sidebar-primary" : "text-muted-foreground"}
                      />

                      <span className="flex-1 text-left">{label}</span>

                      {badge !== undefined && badge > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          isActive ? "bg-primary text-white" : "bg-red-500 text-white"
                        }`}>
                          {badge}
                        </span>
                      )}

                      {isActive && <ChevronRight size={14} className="text-sidebar-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Semester info */}
            <div className="mt-6 mx-1 p-3 bg-muted rounded-xl">
              <p className="text-xs font-medium text-foreground mb-1">
                Semestre Ene–Jun 2026
              </p>

              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "72%" }} />
              </div>

              <p className="text-xs text-muted-foreground mt-1">
                Semana 13 de 18 · 72%
              </p>
            </div>
          </nav>

          {/* User footer */}
          <div className="px-4 py-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">
                  {user.name}
                </p>

                <p className="text-xs text-muted-foreground truncate uppercase">
                  {user.role}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="text-muted-foreground hover:text-red-500 transition-colors"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 flex-shrink-0 lg:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Menu size={20} className="text-muted-foreground" />
            </button>

            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>EduCampus</span>
              <ChevronRight size={14} />

              <span className="text-foreground font-medium">
                {page === "task-detail"
                  ? "Detalle de Tarea"
                  : NAV_ITEMS.find((n) => n.id === page)?.label || "Dashboard"}
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => navigate("notifications")}
                className="relative p-2 rounded-lg hover:bg-accent transition-colors"
                title={
                  user.role === "teacher"
                    ? "Solicitudes de plazo pendientes"
                    : "Tareas próximas o vencidas"
                }
              >
                <Bell size={18} className="text-muted-foreground" />

                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </button>

              <div
                className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold cursor-pointer"
                onClick={() => navigate("profile")}
              >
                {initials}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            {page === "dashboard" && <Dashboard user={user} onNavigate={navigate} />}

            {page === "notifications" && (
              <NotificationsPage user={user} notificationCount={notificationCount} onNavigate={navigate} />
            )}

            {(page === "tasks" || page === "task-detail") && (
              <Tasks user={user} initialTaskId={taskId} onNavigate={navigate} />
            )}

            {page === "materials" && <Materials user={user} />}

            {page === "grades" && <Grades user={user} />}

            {page === "profile" && <Profile user={user} onLogout={handleLogout} />}
          </main>
        </div>
      </div>
    </DndProvider>
  );
}