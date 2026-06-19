import { useEffect, useState } from "react";
import { BarChart2, TrendingUp, TrendingDown, Award, ChevronDown, MessageSquare, Star, ChevronRight, Save } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Evaluation {
  id: string;
  evaluation_id?: string | null;
  name: string;
  type: "parcial" | "quiz" | "tarea" | "proyecto" | "laboratorio" | "final";
  grade: number | null;
  maxGrade: number;
  weight: number;
  date?: string;
  feedback?: string;
  graded: boolean;
  canEdit?: boolean;
  student_name?: string;
}

interface SubjectGrade {
  id: string;
  subject: string;
  color: string;
  teacher: string;
  evaluations: Evaluation[];
}

const API_URL = "http://localhost:3001/api";

const TYPE_LABELS: Record<string, string> = {
  parcial: "Parcial",
  quiz: "Quiz",
  tarea: "Tarea",
  proyecto: "Proyecto",
  laboratorio: "Lab",
  final: "Final",
};

const TYPE_COLORS: Record<string, string> = {
  parcial: "bg-blue-100 text-blue-700",
  quiz: "bg-purple-100 text-purple-700",
  tarea: "bg-amber-100 text-amber-700",
  proyecto: "bg-emerald-100 text-emerald-700",
  laboratorio: "bg-teal-100 text-teal-700",
  final: "bg-red-100 text-red-700",
};

function gradeToLetter(g: number) {
  if (g >= 9.5) return "A+";
  if (g >= 9.0) return "A";
  if (g >= 8.5) return "A-";
  if (g >= 8.0) return "B+";
  if (g >= 7.5) return "B";
  if (g >= 7.0) return "B-";
  if (g >= 6.0) return "C";
  return "F";
}

function gradeColor(g: number) {
  if (g >= 9.0) return "text-emerald-600";
  if (g >= 8.0) return "text-blue-600";
  if (g >= 7.0) return "text-amber-600";
  return "text-red-600";
}

export function Grades({ user }: { user?: { id: string; role: string; name: string } }) {
  const [subjects, setSubjects] = useState<SubjectGrade[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [draftGrades, setDraftGrades] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadGrades = async () => {
      try {
        const res = await fetch(`${API_URL}/grades?userId=${user.id}`);
        const data = await res.json();
        setSubjects(data);
      } catch (err) {
        console.error("Error cargando calificaciones:", err);
      }
    };

    loadGrades();
  }, [user]);

  const calculateSubjectAvg = (subject: SubjectGrade) => {
    const graded = subject.evaluations.filter((e) => e.grade !== null && e.grade !== undefined);
    if (graded.length === 0) return 0;
    const totalWeight = graded.reduce((sum, e) => sum + (e.weight || 0), 0);
    if (totalWeight === 0) return 0;
    return graded.reduce((sum, e) => sum + (e.grade || 0) * (e.weight || 0), 0) / totalWeight;
  };

  const overallAvg = subjects.length > 0
    ? (subjects.reduce((sum, s) => sum + calculateSubjectAvg(s), 0) / subjects.length).toFixed(1)
    : "0.0";

  const radarData = subjects.map((s) => ({
    subject: s.subject.split(" ")[0],
    grade: calculateSubjectAvg(s) * 10,
  }));

  const trendData = [
    { semana: "S1", promedio: 7.8 },
    { semana: "S2", promedio: 8.1 },
    { semana: "S3", promedio: 7.9 },
    { semana: "S4", promedio: 8.3 },
    { semana: "S5", promedio: 8.5 },
    { semana: "S6", promedio: 8.2 },
    { semana: "S7", promedio: 8.6 },
    { semana: "S8", promedio: Number(overallAvg) },
  ];

  const saveGrade = async (evaluationId: string, current: Evaluation) => {
    if (!user?.id || !evaluationId) return;
    const draft = draftGrades[evaluationId] || { grade: current.grade?.toString() || "", feedback: current.feedback || "" };
    const parsedGrade = Number(draft.grade);
    if (Number.isNaN(parsedGrade)) return;

    setSavingId(evaluationId);
    try {
      const res = await fetch(`${API_URL}/evaluations/${evaluationId}/grade`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: parsedGrade,
          feedback: draft.feedback,
          gradedBy: user.id,
        }),
      });
      if (!res.ok) throw new Error("No se pudo guardar la calificación");

      setSubjects((prev) => prev.map((subject) => ({
        ...subject,
        evaluations: subject.evaluations.map((ev) =>
          ev.id === evaluationId
            ? { ...ev, grade: parsedGrade, feedback: draft.feedback, graded: true }
            : ev
        ),
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1>Calificaciones</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Semestre Enero – Junio 2026</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <Award size={16} className="text-primary" />
            <span className="text-xs text-muted-foreground">Promedio general</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-semibold ${gradeColor(Number(overallAvg))}`}>{overallAvg}</span>
            <span className="text-sm text-muted-foreground">/ 10.0</span>
          </div>
          <span className="text-sm font-medium text-muted-foreground">{gradeToLetter(Number(overallAvg))}</span>
        </div>
        {[
          { label: "Asignaturas", value: subjects.length, sub: "activas", icon: BarChart2 },
          { label: "Evaluaciones", value: subjects.flatMap((s) => s.evaluations).filter((e) => e.graded).length, sub: "calificadas", icon: Star },
          { label: "Pendientes", value: subjects.flatMap((s) => s.evaluations).filter((e) => !e.graded).length, sub: "por calificar", icon: ChevronRight },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-card rounded-xl border border-border shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-foreground">{item.value}</span>
                <span className="text-xs text-muted-foreground">{item.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-primary" /> Tendencia semanal
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
              <YAxis domain={[7, 10]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [v.toFixed(1), "Promedio"]} />
              <Line type="monotone" dataKey="promedio" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-sm mb-4 flex items-center gap-2">
            <BarChart2 size={15} className="text-primary" /> Desempeño por asignatura
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
              <PolarGrid stroke="rgba(0,0,0,0.08)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <Radar name="Calificación" dataKey="grade" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm text-muted-foreground uppercase tracking-wide">Detalle por asignatura</h3>
        {subjects.map((s) => {
          const isExpanded = expandedId === s.id;
          const subjectAvg = calculateSubjectAvg(s);
          const gradedEvals = s.evaluations.filter((e) => e.graded);
          return (
            <div key={s.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                className="w-full p-4 flex items-center gap-3 hover:bg-accent/30 transition-colors text-left"
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{s.subject}</span>
                    {subjectAvg >= 8.5 && <TrendingUp size={13} className="text-emerald-500" />}
                    {subjectAvg < 7.5 && <TrendingDown size={13} className="text-red-500" />}
                  </div>
                  <span className="text-xs text-muted-foreground">{s.teacher}</span>
                </div>
                <div className="text-right mr-2">
                  <div className={`text-xl font-semibold ${gradeColor(subjectAvg)}`}>{subjectAvg.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">{gradeToLetter(subjectAvg)}</div>
                </div>
                <div className="w-24 hidden lg:block">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(subjectAvg / 10) * 100}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-border p-4 space-y-2">
                  <div className="grid gap-2">
                    {s.evaluations.map((ev) => (
                      <div key={ev.id} className="p-2.5 rounded-lg hover:bg-accent/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${TYPE_COLORS[ev.type]}`}>
                            {TYPE_LABELS[ev.type]}
                          </span>
                          <span className="text-sm flex-1 text-foreground">{ev.name}</span>
                          <span className="text-xs text-muted-foreground">{ev.weight}%</span>
                          {ev.graded && ev.grade !== null && ev.grade !== undefined ? (
                            <span className={`text-sm font-semibold font-mono w-10 text-right ${gradeColor(ev.grade)}`}>
                              {ev.grade.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground w-10 text-right">—</span>
                          )}
                          {ev.feedback && (
                            <button
                              onClick={() => setSelectedFeedback(ev.feedback || null)}
                              className="p-1 text-primary hover:bg-blue-50 rounded transition-colors"
                              title="Ver retroalimentación"
                            >
                              <MessageSquare size={13} />
                            </button>
                          )}
                        </div>
                        {user?.role === "teacher" && ev.canEdit && (
                          <div className="mt-2 grid gap-2 md:grid-cols-[120px_1fr_auto]">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max={ev.maxGrade}
                              value={draftGrades[ev.id]?.grade ?? ev.grade ?? ""}
                              onChange={(e) => setDraftGrades((prev) => ({
                                ...prev,
                                [ev.id]: {
                                  grade: e.target.value,
                                  feedback: prev[ev.id]?.feedback ?? ev.feedback ?? "",
                                },
                              }))}
                              className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg"
                              placeholder="Nota"
                            />
                            <input
                              value={draftGrades[ev.id]?.feedback ?? ev.feedback ?? ""}
                              onChange={(e) => setDraftGrades((prev) => ({
                                ...prev,
                                [ev.id]: {
                                  grade: prev[ev.id]?.grade ?? ev.grade?.toString() ?? "",
                                  feedback: e.target.value,
                                },
                              }))}
                              className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg"
                              placeholder="Retroalimentación"
                            />
                            <button
                              onClick={() => saveGrade(ev.id, ev)}
                              disabled={savingId === ev.id}
                              className="px-3 py-2 bg-primary text-primary-foreground text-sm rounded-lg flex items-center justify-center gap-2"
                            >
                              <Save size={14} />
                              {savingId === ev.id ? "Guardando" : "Guardar"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {gradedEvals.length}/{s.evaluations.length} evaluaciones calificadas
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Promedio: <strong>{subjectAvg.toFixed(1)}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6" onClick={() => setSelectedFeedback(null)}>
          <div
            className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-primary" />
              <h3>Retroalimentación del docente</h3>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{selectedFeedback}</p>
            <button
              onClick={() => setSelectedFeedback(null)}
              className="mt-5 w-full py-2.5 bg-primary text-primary-foreground text-sm rounded-xl hover:opacity-90 transition-opacity"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
