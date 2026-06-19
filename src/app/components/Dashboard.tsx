import { useState, useEffect } from "react";
import {
  BookOpen, CheckCircle, Clock, AlertCircle, TrendingUp,
  Calendar, FileText, Bell, ChevronRight, Award, BarChart2,
  Zap, ArrowRight
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  subject: string;
  subjectColor: string;
  dueDate: Date;
  status: "pending" | "due-soon" | "submitted" | "late";
  points: number;
}

interface Evaluation {
  grade: number | null;
  maxGrade: number;
  weight: number;
}

interface SubjectGrade {
  subject: string;
  color: string;
  evaluations: Evaluation[];
}

const API_URL = "http://localhost:3001/api";

function resolveTaskStatus(task: { status: string; dueDate: Date }) {
  if (task.status === "submitted") return "submitted";
  const now = Date.now();
  const dueTime = task.dueDate.getTime();
  if (dueTime < now) return "late";
  const oneDayMs = 24 * 60 * 60 * 1000;
  if (dueTime - now <= oneDayMs) return "due-soon";
  return "pending";
}

function CountdownTimer({ dueDate, status }: { dueDate: Date; status: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = dueDate.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Vencida");
        return;
      }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setIsUrgent(diff < 3600000);
      if (hrs > 0) setTimeLeft(`${hrs}h ${mins}m`);
      else setTimeLeft(`${mins}m ${secs}s`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [dueDate]);

  if (status === "submitted") return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono ${
        isUrgent
          ? "bg-red-100 text-red-700 animate-pulse"
          : status === "late"
          ? "bg-red-50 text-red-600"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {isUrgent && <Zap size={10} />}
      <Clock size={10} />
      {timeLeft}
    </span>
  );
}

function StatusBadge({ status }: { status: Task["status"] }) {
  const config = {
    submitted: { label: "Entregada", bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle },
    "due-soon": { label: "Próxima", bg: "bg-amber-50", text: "text-amber-700", icon: Clock },
    late: { label: "Atrasada", bg: "bg-red-50", text: "text-red-700", icon: AlertCircle },
    pending: { label: "Pendiente", bg: "bg-slate-100", text: "text-slate-600", icon: FileText },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${c.bg} ${c.text}`}>
      <Icon size={11} />
      {c.label}
    </span>
  );
}

interface DashboardProps {
  user?: { id: string, name: string, role: string };
  onNavigate: (page: string, taskId?: string) => void;
}

export function Dashboard({ user, onNavigate }: DashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [grades, setGrades] = useState<SubjectGrade[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      try {
        const [tasksRes, gradesRes] = await Promise.all([
          fetch(`${API_URL}/tasks?userId=${user.id}`),
          fetch(`${API_URL}/grades?userId=${user.id}`),
        ]);
        const tasksData = await tasksRes.json();
        const gradesData = await gradesRes.json();

        setTasks(
          tasksData.map((t: any) => ({
            id: String(t.id),
            title: t.title,
            subject: t.subject,
            subjectColor: t.subjectColor || t.color || "#2563EB",
            dueDate: new Date(t.due_date),
            status: resolveTaskStatus({ status: t.status || "pending", dueDate: new Date(t.due_date) }),
            points: Number(t.points || t.max_points || 0),
          }))
        );

        setGrades(gradesData);
      } catch (err) {
        console.error("Error cargando dashboard:", err);
      }
    };

    loadData();
  }, [user]);

  const submitted = tasks.filter((t) => t.status === "submitted").length;
  const pending = tasks.filter((t) => t.status === "pending" || t.status === "due-soon").length;
  const late = tasks.filter((t) => t.status === "late").length;

  const gradeValues = grades
    .flatMap((g) => g.evaluations)
    .filter((e) => e.grade !== null && e.grade !== undefined)
    .map((e) => e.grade || 0);

  const avgGrade = gradeValues.length > 0
    ? (gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length).toFixed(1)
    : "0.0";

  const upcomingTasks = tasks
    .filter((t) => t.status !== "submitted")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 4);

  const topGrades = grades
    .map((g) => {
      const graded = g.evaluations.filter((e) => e.grade !== null && e.grade !== undefined);
      const avg = graded.length > 0
        ? graded.reduce((sum, e) => sum + (e.grade || 0), 0) / graded.length
        : 0;
      return {
        subject: g.subject,
        color: g.color,
        grade: avg,
        letter: avg >= 9 ? "A" : avg >= 8 ? "B+" : avg >= 7 ? "B" : "C",
      };
    })
    .sort((a, b) => b.grade - a.grade)
    .slice(0, 4);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Lunes, 16 de junio de 2026</p>
          <h1 className="mt-0.5">Bienvenido, {user?.name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tienes <span className="text-amber-600 font-medium">{pending} tareas pendientes</span>
            {late > 0 && (
              <> y <span className="text-red-600 font-medium">{late} atrasada{late > 1 ? "s" : ""}</span></>
            )}
          </p>
        </div>
        <button className="relative p-2 rounded-lg hover:bg-accent transition-colors">
          <Bell size={20} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Promedio General", value: avgGrade, sub: "/ 10.0", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Entregadas", value: submitted, sub: "esta semana", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Pendientes", value: pending, sub: "por entregar", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Atrasadas", value: late, sub: "requieren atención", icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={stat.color} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-foreground">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.sub}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Tasks */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              <h3 className="text-sm">Próximas Tareas</h3>
            </div>
            <button
              onClick={() => onNavigate("tasks")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Ver todas <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-border">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="px-5 py-3.5 hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => onNavigate("task-detail", task.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: task.subjectColor }}
                      />
                      <span className="text-xs text-muted-foreground truncate">{task.subject}</span>
                    </div>
                    <p className="text-sm text-foreground truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <StatusBadge status={task.status} />
                      {(task.status === "due-soon" || task.status === "pending") && (
                        <CountdownTimer dueDate={task.dueDate} status={task.status} />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">{task.points} pts</span>
                    {task.status !== "submitted" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate("task-detail", task.id);
                        }}
                        className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
                      >
                        Entregar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick Access */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <h3 className="text-sm mb-3 flex items-center gap-2">
              <Zap size={15} className="text-primary" />
              Accesos Rápidos
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Tareas", icon: FileText, page: "tasks", color: "bg-blue-50 text-blue-700" },
                { label: "Materiales", icon: BookOpen, page: "materials", color: "bg-purple-50 text-purple-700" },
                { label: "Notas", icon: BarChart2, page: "grades", color: "bg-emerald-50 text-emerald-700" },
                { label: "Calendario", icon: Calendar, page: "tasks", color: "bg-amber-50 text-amber-700" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => onNavigate(item.page)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg ${item.color} hover:opacity-80 transition-opacity`}
                  >
                    <Icon size={18} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grades summary */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm flex items-center gap-2">
                <Award size={15} className="text-primary" />
                Calificaciones
              </h3>
              <button
                onClick={() => onNavigate("grades")}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Ver <ArrowRight size={10} />
              </button>
            </div>
            <div className="space-y-2.5">
              {topGrades.map((g) => (
                <div key={g.subject} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                  <span className="text-xs text-foreground flex-1 truncate">{g.subject}</span>
                  <span className="text-xs font-mono font-medium text-foreground">{g.grade.toFixed(1)}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ backgroundColor: `${g.color}18`, color: g.color }}
                  >
                    {g.letter}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
