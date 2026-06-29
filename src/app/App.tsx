import { useState, useEffect } from "react";
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

type Page = "dashboard" | "tasks" | "task-detail" | "materials" | "grades" | "profile";

interface NavItem {
  id: Page;
  label: string;
  Icon: React.ElementType;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "tasks", label: "Tareas", Icon: FileText, badge: 3 },
  { id: "materials", label: "Materiales", Icon: BookOpen },
  { id: "grades", label: "Calificaciones", Icon: BarChart2 },
  { id: "profile", label: "Perfil", Icon: User },
];

export default function App() {
  // Intentamos recuperar el usuario del localStorage al arrancar
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [page, setPage] = useState<Page>("dashboard");
  const [taskId, setTaskId] = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  const navigate = (p: string, tid?: string) => {
    setPage(p as Page);
    setTaskId(tid);
    setSidebarOpen(false);
  };

  const activeNavId = page === "task-detail" ? "tasks" : page;

  // Si no hay usuario, mostramos la pantalla de Login directamente
  if (!user) {
    return <Login onLoginSuccess={(userData) => setUser(userData)} />;
  }

  if (user.role === "admin") {
    return <AdminPanel user={user} onLogout={handleLogout} />;
  }

  // Obtener iniciales para el avatar
  const initials = user.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();

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
            <p className="text-xs text-muted-foreground uppercase tracking-widest px-2 mb-2">Navegación</p>
            <ul className="space-y-0.5">
              {NAV_ITEMS.map(({ id, label, Icon, badge }) => {
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
                      <Icon size={17} className={isActive ? "text-sidebar-primary" : "text-muted-foreground"} />
                      <span className="flex-1 text-left">{label}</span>
                      {badge && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary text-white" : "bg-red-500 text-white"}`}>
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
              <p className="text-xs font-medium text-foreground mb-1">Semestre Ene–Jun 2026</p>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "72%" }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Semana 13 de 18 · 72%</p>
            </div>
          </nav>

          {/* User footer */}
          <div className="px-4 py-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate uppercase">{user.role}</p>
              </div>
              <button onClick={handleLogout} className="text-muted-foreground hover:text-red-500 transition-colors">
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
                {page === "task-detail" ? "Detalle de Tarea" : NAV_ITEMS.find((n) => n.id === page)?.label || "Dashboard"}
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button className="relative p-2 rounded-lg hover:bg-accent transition-colors">
                <Bell size={18} className="text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
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
