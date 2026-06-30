import { useState, useCallback, useEffect, useRef } from "react";
import { useDrop, useDrag } from "react-dnd";
import {
  FileText, CheckCircle, Clock, AlertCircle, Filter, Search,
  Upload, X, Eye, Zap, Plus, Trash2, Edit3, ChevronDown,
  File, Image, FileCode, Download, AlertTriangle, BellRing,
  CalendarPlus, Send
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  subject: string;
  subjectColor: string;
  dueDate: Date;
  status: "pending" | "due-soon" | "submitted" | "late";
  points: number;
  description: string;
  submittedFile?: string;
  submittedAt?: Date;
  submittedUrl?: string;
  extensionStatus?: "pending" | "approved" | "rejected";
  submissionId?: string;
  studentId?: string;
  studentName?: string;
  teacherFeedback?: string;
  teacherGrade?: number;
  reviewStatus?: "not_submitted" | "pending_review" | "reviewed";
}

interface ExtensionRequest {
  id: string;
  assignment_id: string;
  assignment_title: string;
  subject: string;
  subjectColor: string;
  student_name: string;
  reason: string;
  requested_due_date: string;
  current_due_date: string;
  status: "pending" | "approved" | "rejected";
  teacher_response?: string;
  created_at: string;
}

const API_URL = "http://localhost:3001/api";

function useCountdown(dueDate: Date) {
  const [display, setDisplay] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = dueDate.getTime() - Date.now();

      if (diff <= 0) {
        setDisplay("Vencida");
        setIsUrgent(false);
        return;
      }

      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      setIsUrgent(diff < 3600000);
      setDisplay(hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m ${secs}s`);
    };

    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [dueDate]);

  return { display, isUrgent };
}

function StatusBadge({ status }: { status: Task["status"] }) {
  const cfg = {
    submitted: { label: "Entregada", cls: "bg-emerald-50 text-emerald-700", Icon: CheckCircle },
    "due-soon": { label: "Próxima a vencer", cls: "bg-amber-50 text-amber-700", Icon: Clock },
    late: { label: "Atrasada", cls: "bg-red-50 text-red-700", Icon: AlertCircle },
    pending: { label: "Pendiente", cls: "bg-slate-100 text-slate-600", Icon: FileText },
  }[status];

  const { Icon } = cfg;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${cfg.cls}`}>
      <Icon size={11} />{cfg.label}
    </span>
  );
}

function formatDate(d: Date | string | number | undefined) {
  if (!d) return "";

  const date = d instanceof Date ? d : new Date(d);

  if (isNaN(date.getTime())) return "Fecha inválida";

  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "svg"].includes(ext || "")) return Image;
  if (["js", "ts", "py", "java", "html", "css"].includes(ext || "")) return FileCode;

  return File;
}

function resolveTaskStatus(task: { status: string; dueDate: Date }) {
  if (task.status === "submitted") return "submitted";

  const now = Date.now();
  const dueTime = task.dueDate.getTime();

  if (dueTime < now) return "late";

  const oneDayMs = 24 * 60 * 60 * 1000;

  if (dueTime - now <= oneDayMs) return "due-soon";

  return "pending";
}

// ─── Drop Zone ───────────────────────────────────────────────────────────────
interface DroppedFile {
  name: string;
  size: number;
  type: string;
  url: string;
  rawFile?: File;
}

function DropZone({ onFileDrop }: { onFileDrop: (f: DroppedFile) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "FILE",
    drop: (item: DroppedFile) => onFileDrop(item),
    collect: (m) => ({ isOver: m.isOver() }),
  }));

  const handleNativeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];

    if (file) {
      onFileDrop({
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        rawFile: file
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      onFileDrop({
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        rawFile: file
      });
    }
  };

  return (
    <div
      ref={drop as unknown as React.RefObject<HTMLDivElement>}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleNativeDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        isOver || dragOver
          ? "border-primary bg-blue-50 scale-[1.01]"
          : "border-border hover:border-primary/50 hover:bg-accent/30"
      }`}
    >
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInput} />

      <Upload
        size={32}
        className={`mx-auto mb-3 ${isOver || dragOver ? "text-primary" : "text-muted-foreground"}`}
      />

      <p className="text-sm text-foreground font-medium">
        {isOver || dragOver ? "Suelta el archivo aquí" : "Arrastra tu archivo aquí"}
      </p>

      <p className="text-xs text-muted-foreground mt-1">
        o haz clic para seleccionar desde tu equipo
      </p>

      <p className="text-xs text-muted-foreground mt-1">
        PDF, DOCX, ZIP, imágenes — máx. 50 MB
      </p>
    </div>
  );
}

// ─── Draggable file item for sidebar ─────────────────────────────────────────
function DraggableFileItem({ file, onRemove }: { file: DroppedFile; onRemove: () => void }) {
  const [, drag] = useDrag(() => ({ type: "FILE", item: file }));
  const Icon = getFileIcon(file.name);

  return (
    <div
      ref={drag as unknown as React.RefObject<HTMLDivElement>}
      className="flex items-center gap-2 p-2 bg-accent/50 rounded-lg cursor-grab active:cursor-grabbing"
    >
      <Icon size={16} className="text-primary flex-shrink-0" />

      <span className="text-xs flex-1 truncate">{file.name}</span>

      <span className="text-xs text-muted-foreground">
        {(file.size / 1024).toFixed(0)} KB
      </span>

      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-red-500 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Task Detail / Submit view ────────────────────────────────────────────────
function TaskDetail({
  task,
  user,
  onBack,
  onSubmit,
  onRequestExtension,
}: {
  task: Task;
  user?: { id: string; role: string };
  onBack: () => void;
  onSubmit: (id: string, file: DroppedFile) => void | Promise<void>;
  onRequestExtension: (id: string, reason: string, requestedDueDate: string) => Promise<void>;
}) {
  const [droppedFile, setDroppedFile] = useState<DroppedFile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [submitted, setSubmitted] = useState(task.status === "submitted");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extensionReason, setExtensionReason] = useState("");
  const [requestedDueDate, setRequestedDueDate] = useState("");
  const [extensionMessage, setExtensionMessage] = useState("");
  const [requestingExtension, setRequestingExtension] = useState(false);

  const [teacherFeedback, setTeacherFeedback] = useState(task.teacherFeedback || "");
  const [teacherGrade, setTeacherGrade] = useState(
    task.teacherGrade !== undefined && task.teacherGrade !== null ? String(task.teacherGrade) : ""
  );
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const { display, isUrgent } = useCountdown(task.dueDate);

  useEffect(() => {
    setSubmitted(task.status === "submitted");
    setTeacherFeedback(task.teacherFeedback || "");
    setTeacherGrade(
      task.teacherGrade !== undefined && task.teacherGrade !== null ? String(task.teacherGrade) : ""
    );
  }, [task.status, task.teacherFeedback, task.teacherGrade]);

  const handleSubmit = async () => {
    if (!droppedFile && !submitted) {
      setError("Debes adjuntar un archivo antes de enviar.");
      return;
    }

    setError("");

    if (!droppedFile) return;

    try {
      await onSubmit(task.id, droppedFile);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la entrega.");
    }
  };

  const handleDelete = () => {
    setSubmitted(false);
    setDroppedFile(null);
    setConfirmDelete(false);
  };

  const handleRequestExtension = async () => {
    if (!extensionReason.trim() || !requestedDueDate) {
      setExtensionMessage("Debes escribir el motivo y elegir una nueva fecha.");
      return;
    }

    setRequestingExtension(true);
    setExtensionMessage("");

    try {
      await onRequestExtension(
        task.id,
        extensionReason.trim(),
        new Date(requestedDueDate).toISOString()
      );

      setExtensionMessage("Solicitud enviada al profesor correctamente.");
      setShowExtensionForm(false);
      setExtensionReason("");
      setRequestedDueDate("");
    } catch (err) {
      setExtensionMessage(
        err instanceof Error ? err.message : "No se pudo enviar la solicitud."
      );
    } finally {
      setRequestingExtension(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!user?.id) {
      setReviewMessage("No se encontró el usuario profesor.");
      return;
    }

    if (!task.studentId) {
      setReviewMessage("No se encontró el estudiante de esta entrega.");
      return;
    }

    setReviewing(true);
    setReviewMessage("");

    try {
      const res = await fetch(`${API_URL}/tasks/${task.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: user.id,
          studentId: task.studentId,
          feedback: teacherFeedback,
          grade: teacherGrade,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo guardar la revisión.");
      }

      setReviewMessage("Entrega marcada como revisada correctamente.");
    } catch (err) {
      setReviewMessage(err instanceof Error ? err.message : "No se pudo guardar la revisión.");
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
      >
        ← Volver a Tareas
      </button>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: task.subjectColor }}
                />

                <span className="text-sm text-muted-foreground">
                  {task.subject}
                </span>

                <StatusBadge status={submitted ? "submitted" : task.status} />

                {task.extensionStatus === "pending" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                    <CalendarPlus size={11} /> Solicitud pendiente
                  </span>
                )}

                {task.extensionStatus === "approved" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700">
                    <CheckCircle size={11} /> Plazo aprobado
                  </span>
                )}

                {task.extensionStatus === "rejected" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700">
                    <X size={11} /> Plazo rechazado
                  </span>
                )}
              </div>

              <h2 className="text-foreground">{task.title}</h2>

              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span>Fecha límite: {formatDate(task.dueDate)}</span>
                <span>•</span>
                <span>{task.points} puntos</span>
              </div>
            </div>

            {!submitted && (task.status === "due-soon" || task.status === "late") && (
              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-mono ${
                isUrgent
                  ? "bg-red-100 text-red-700"
                  : task.status === "late"
                    ? "bg-red-50 text-red-600"
                    : "bg-amber-50 text-amber-700"
              }`}>
                {isUrgent && <Zap size={14} />}
                <Clock size={14} />
                {display}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="p-6 border-b border-border">
          <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Instrucciones
          </h4>

          <p className="text-sm text-foreground leading-relaxed">
            {task.description}
          </p>
        </div>

        {/* Request extension section */}
        {user?.role === "student" && !submitted && (task.status === "due-soon" || task.status === "late") && (
          <div className="p-6 border-b border-border space-y-3 bg-amber-50/60">
            <div className="flex items-start gap-3">
              <BellRing
                size={18}
                className={task.status === "late" ? "text-red-600" : "text-amber-600"}
              />

              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {task.status === "late"
                    ? "Esta tarea ya pasó el plazo"
                    : "Esta tarea está cerca de vencer"}
                </p>

                <p className="text-xs text-muted-foreground mt-0.5">
                  Puedes pedir más plazo al profesor explicando el motivo de la solicitud.
                </p>
              </div>

              {task.extensionStatus === "pending" ? (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                  Solicitud pendiente
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowExtensionForm(!showExtensionForm)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-xs rounded-lg hover:opacity-90"
                >
                  <CalendarPlus size={13} /> Pedir más plazo
                </button>
              )}
            </div>

            {showExtensionForm && task.extensionStatus !== "pending" && (
              <div className="space-y-3 bg-card border border-border rounded-xl p-4">
                <div>
                  <label className="text-xs text-muted-foreground">
                    Nueva fecha solicitada
                  </label>

                  <input
                    type="datetime-local"
                    value={requestedDueDate}
                    onChange={(e) => setRequestedDueDate(e.target.value)}
                    className="w-full mt-1 p-2 bg-muted rounded-lg text-sm border border-border"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">
                    Motivo
                  </label>

                  <textarea
                    rows={3}
                    value={extensionReason}
                    onChange={(e) => setExtensionReason(e.target.value)}
                    placeholder="Ej: Tuve problemas técnicos, enfermedad, falta de conexión, etc."
                    className="w-full mt-1 p-2 bg-muted rounded-lg text-sm border border-border resize-none"
                  />
                </div>

                {extensionMessage && (
                  <p className="text-xs text-muted-foreground">
                    {extensionMessage}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleRequestExtension}
                  disabled={requestingExtension}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  <Send size={14} />
                  {requestingExtension ? "Enviando..." : "Enviar solicitud al profesor"}
                </button>
              </div>
            )}

            {extensionMessage && !showExtensionForm && (
              <p className="text-xs text-muted-foreground">
                {extensionMessage}
              </p>
            )}
          </div>
        )}

        {user?.role === "student" && (task.teacherFeedback || task.teacherGrade !== undefined) && (
          <div className="p-6 border-b border-border space-y-3 bg-emerald-50/40">
            <h4 className="text-sm font-medium text-foreground">
              Retroalimentación del profesor
            </h4>

            {task.teacherGrade !== undefined && task.teacherGrade !== null && (
              <p className="text-sm text-emerald-800">
                Nota: <span className="font-semibold">{task.teacherGrade}</span>
              </p>
            )}

            {task.teacherFeedback && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {task.teacherFeedback}
              </p>
            )}
          </div>
        )}

        {user?.role === "teacher" && (
          <div className="p-6 border-b border-border space-y-4 bg-blue-50/40">
            <div>
              <h4 className="text-sm font-medium text-foreground">
                Revisión del profesor
              </h4>

              <p className="text-xs text-muted-foreground mt-1">
                Estudiante: {task.studentName || "Sin entrega asociada todavía"}
              </p>

              {task.submittedFile ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Archivo entregado: {task.submittedFile}
                </p>
              ) : (
                <p className="text-xs text-red-600 mt-1">
                  Esta tarea todavía no tiene archivo entregado por el estudiante.
                </p>
              )}
            </div>

            {task.submittedUrl && (
              <a
                href={task.submittedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs rounded-lg hover:opacity-90"
              >
                <Download size={13} /> Descargar entrega
              </a>
            )}

            <div>
              <label className="text-xs text-muted-foreground">
                Nota
              </label>

              <input
                type="number"
                min="0"
                step="0.1"
                value={teacherGrade}
                onChange={(e) => setTeacherGrade(e.target.value)}
                className="w-full mt-1 p-2 bg-card rounded-lg text-sm border border-border"
                placeholder="Ej: 6.5"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">
                Retroalimentación / comentario
              </label>

              <textarea
                rows={4}
                value={teacherFeedback}
                onChange={(e) => setTeacherFeedback(e.target.value)}
                placeholder="Escribe una retroalimentación para el estudiante..."
                className="w-full mt-1 p-2 bg-card rounded-lg text-sm border border-border resize-none"
              />
            </div>

            {reviewMessage && (
              <p className="text-xs text-muted-foreground">
                {reviewMessage}
              </p>
            )}

            <button
              type="button"
              onClick={handleReviewSubmit}
              disabled={reviewing || !task.studentId || !task.submittedUrl}
              className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              <CheckCircle size={14} />
              {reviewing ? "Guardando revisión..." : "Marcar como revisado"}
            </button>
          </div>
        )}

        {user?.role !== "teacher" && (
          <>
            {/* Upload section */}
            <div className="p-6">
          {submitted ? (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Entrega actual
              </h4>

              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-800 truncate">
                    {task.submittedFile || droppedFile?.name}
                  </p>

                  <p className="text-xs text-emerald-600 mt-0.5">
                    Entregado el {formatDate(task.submittedAt || new Date())}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={task.submittedUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
                    title="Descargar"
                  >
                    <Download size={15} className="text-emerald-700" />
                  </a>
                </div>
              </div>

              {/* Re-upload before deadline */}
              {task.dueDate > new Date() && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Edit3 size={12} /> Puedes reemplazar tu entrega antes de la fecha límite
                  </p>

                  <DropZone
                    onFileDrop={(f) => {
                      setDroppedFile(f);
                      setSubmitted(false);
                    }}
                  />
                </div>
              )}

              {confirmDelete ? (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle size={16} className="text-red-600" />

                  <p className="text-sm text-red-700 flex-1">
                    ¿Eliminar entrega? Esta acción no se puede deshacer.
                  </p>

                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                  >
                    Eliminar
                  </button>

                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                task.dueDate > new Date() && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={12} /> Eliminar entrega
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Adjuntar archivo
              </h4>

              {task.status === "late" && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={15} className="text-red-600 flex-shrink-0" />

                  <p className="text-xs text-red-700">
                    Esta tarea venció el {formatDate(task.dueDate)}. Aún puedes entregar con penalización.
                  </p>
                </div>
              )}

              <DropZone onFileDrop={setDroppedFile} />

              {droppedFile && (
                <div className="space-y-2">
                  <DraggableFileItem
                    file={droppedFile}
                    onRemove={() => setDroppedFile(null)}
                  />

                  <button
                    onClick={() => setShowPreview(true)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Eye size={12} /> Vista previa del archivo
                  </button>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-600 flex items-center gap-1.5 p-2 bg-red-50 rounded-lg">
                  <AlertCircle size={13} /> {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${
                  droppedFile
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Upload size={16} /> Enviar entrega
                </span>
              </button>
            </div>
          )}
            </div>
          </>
        )}

      </div>

      {/* Preview modal */}
      {showPreview && droppedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-primary" />

                <span className="text-sm font-medium">
                  Vista previa: {droppedFile.name}
                </span>
              </div>

              <button
                onClick={() => setShowPreview(false)}
                className="p-1.5 hover:bg-accent rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center">
              {droppedFile.type.startsWith("image/") ? (
                <img
                  src={droppedFile.url}
                  alt={droppedFile.name}
                  className="max-w-full max-h-96 rounded-lg object-contain"
                />
              ) : droppedFile.type === "application/pdf" ? (
                <iframe
                  src={droppedFile.url}
                  className="w-full h-96 rounded-lg"
                  title="PDF preview"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <File size={48} className="mx-auto mb-3 opacity-40" />

                  <p className="text-sm">
                    Vista previa no disponible para este tipo de archivo
                  </p>

                  <p className="text-xs mt-1">
                    Nombre: {droppedFile.name} • Tamaño: {(droppedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cerrar
              </button>

              <button
                onClick={() => {
                  setShowPreview(false);
                  handleSubmit();
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Upload size={14} /> Confirmar y enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tasks List ────────────────────────────────────────────────────────────────
interface TasksProps {
  initialTaskId?: string;
  user?: { id: string; role: string };
  onNavigate: (page: string, taskId?: string) => void;
}

const SUBJECT_LIST = [
  { id: "s1", name: "Programación Web" },
  { id: "s2", name: "Economía Internacional" }
];

const STATUS_FILTERS = ["Todos", "Pendiente", "Próxima a vencer", "Entregada", "Atrasada"];

export function Tasks({ initialTaskId, user, onNavigate }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [extensionRequests, setExtensionRequests] = useState<ExtensionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    subject_id: string;
    due_date: string;
    points: number;
    file: File | null;
  }>({
    title: "",
    description: "",
    subject_id: "s1",
    due_date: "",
    points: 10,
    file: null
  });

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("Todas las asignaturas");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [search, setSearch] = useState("");

  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const fetchTasks = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log("Cargando lista de tareas desde la API...");

      const res = await fetch(`${API_URL}/tasks?userId=${user.id}`);
      const data = await res.json();

      const formatted = data.map((t: any) => {
        const dueDate = new Date(t.due_date);

        const resolvedStatus = resolveTaskStatus({
          status: t.status || "pending",
          dueDate,
        });

        return {
          ...t,
          id: String(t.id),
          dueDate,
          submittedAt: t.submittedAt || t.submitted_at ? new Date(t.submittedAt || t.submitted_at) : undefined,
          submittedFile: t.submittedFile || t.submitted_file,
          submittedUrl: t.submittedUrl || t.submitted_url,
          extensionStatus: t.extensionStatus || t.extension_status,
          submissionId: t.submissionId || t.submission_id,
          studentId: t.studentId || t.student_id,
          studentName: t.studentName || t.student_name,
          teacherFeedback: t.teacherFeedback || t.teacher_feedback,
          teacherGrade: t.teacherGrade ?? t.teacher_grade,
          reviewStatus: t.reviewStatus || t.review_status,
          status: resolvedStatus,
        };
      });

      console.log("Tareas cargadas correctamente:", formatted.length);

      setTasks(formatted);

      if (initialTaskId) {
        setSelectedTask(formatted.find((t: Task) => t.id === initialTaskId) || null);
      }
    } catch (err) {
      console.error("Error cargando tareas:", err);
    } finally {
      setLoading(false);
    }
  }, [user, initialTaskId]);

  const fetchExtensionRequests = useCallback(async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`${API_URL}/extension-requests?userId=${user.id}`);

      if (!res.ok) return;

      const data = await res.json();

      setExtensionRequests(data);
    } catch (err) {
      console.error("Error cargando solicitudes de plazo:", err);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchExtensionRequests();
  }, [fetchExtensionRequests]);

  useEffect(() => {
    if (user?.role !== "student") return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const alertTasks = tasks.filter(
      (t) => t.status === "due-soon" || t.status === "late"
    );

    if (alertTasks.length === 0) return;

    const todayKey = new Date().toISOString().slice(0, 10);
    const storageKey = `deadline-alerts-${user.id}-${todayKey}`;

    if (localStorage.getItem(storageKey)) return;

    new Notification("Alerta de tareas", {
      body: `Tienes ${alertTasks.length} tarea(s) vencidas o cerca de vencer.`,
    });

    localStorage.setItem(storageKey, "1");
  }, [tasks, user]);

  const activateBrowserAlerts = async () => {
    if (typeof Notification === "undefined") {
      alert("Tu navegador no soporta notificaciones.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const handleSubmit = useCallback(async (id: string, file: DroppedFile) => {
    if (!file.rawFile) return;

    const formData = new FormData();

    formData.append("file", file.rawFile);
    formData.append("userId", user?.id || "");

    console.log(`Subiendo archivo de entrega para tarea ${id}...`);

    const res = await fetch(`${API_URL}/tasks/${id}/submit`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "No se pudo enviar la entrega.");
    }

    console.log("Entrega enviada. Refrescando lista de tareas...");

    await fetchTasks();
  }, [fetchTasks, user]);

  const handleRequestExtension = useCallback(async (
    id: string,
    reason: string,
    requestedDueDate: string
  ) => {
    const res = await fetch(`${API_URL}/tasks/${id}/extension-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        studentId: user?.id,
        reason,
        requestedDueDate,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "No se pudo enviar la solicitud de plazo.");
    }

    await fetchTasks();
    await fetchExtensionRequests();
  }, [fetchTasks, fetchExtensionRequests, user]);

  const handleUpdateExtensionRequest = async (
    requestId: string,
    status: "approved" | "rejected"
  ) => {
    const res = await fetch(`${API_URL}/extension-requests/${requestId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        teacherId: user?.id,
        status,
        teacherResponse: status === "approved"
          ? "Solicitud aprobada"
          : "Solicitud rechazada",
      }),
    });

    if (res.ok) {
      await fetchTasks();
      await fetchExtensionRequests();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append("title", newTask.title);
    formData.append("description", newTask.description);
    formData.append("subject_id", newTask.subject_id);
    formData.append("teacher_id", user?.id || "u2");
    formData.append("due_date", new Date(newTask.due_date).toISOString());
    formData.append("points", String(newTask.points));

    if (newTask.file) {
      formData.append("file", newTask.file);
    }

    const res = await fetch(`${API_URL}/tasks`, {
      method: "POST",
      body: formData
    });

    if (res.ok) {
      setShowCreateModal(false);
      fetchTasks();
    }
  };

  if (selectedTask) {
    return (
      <TaskDetail
        task={tasks.find((t) => t.id === selectedTask.id) || selectedTask}
        user={user}
        onBack={() => setSelectedTask(null)}
        onSubmit={handleSubmit}
        onRequestExtension={handleRequestExtension}
      />
    );
  }

  const filtered = tasks.filter((t) => {
    const matchSubject =
      subjectFilter === "Todas las asignaturas" || t.subject === subjectFilter;

    const matchStatus =
      statusFilter === "Todos" ||
      (statusFilter === "Pendiente" && t.status === "pending") ||
      (statusFilter === "Próxima a vencer" && t.status === "due-soon") ||
      (statusFilter === "Entregada" && t.status === "submitted") ||
      (statusFilter === "Atrasada" && t.status === "late");

    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase());

    return matchSubject && matchStatus && matchSearch;
  });

  const sortOrder: Record<string, number> = {
    late: 0,
    "due-soon": 1,
    pending: 2,
    submitted: 3
  };

  filtered.sort(
    (a, b) =>
      (sortOrder[a.status] - sortOrder[b.status]) ||
      a.dueDate.getTime() - b.dueDate.getTime()
  );

  const deadlineAlerts = tasks.filter(
    (t) => user?.role === "student" && (t.status === "due-soon" || t.status === "late")
  );

  const pendingExtensionRequests = extensionRequests.filter(
    (r) => r.status === "pending"
  );

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1>Mis Tareas</h1>

          <p className="text-sm text-muted-foreground mt-0.5">
            {tasks.length} tareas en total
          </p>
        </div>

        {user?.role === "teacher" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus size={15} /> Nueva tarea
          </button>
        )}
      </div>

      {deadlineAlerts.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-900">
              Alerta de plazo
            </p>

            <p className="text-xs text-amber-700">
              Tienes {deadlineAlerts.length} tarea(s) vencidas o cerca de vencer.
              Abre una tarea para pedir más plazo al profesor.
            </p>
          </div>

          {notificationPermission !== "granted" && (
            <button
              onClick={activateBrowserAlerts}
              className="px-3 py-2 bg-white border border-amber-200 text-amber-700 text-xs rounded-lg hover:bg-amber-100"
            >
              Activar alertas
            </button>
          )}
        </div>
      )}

      {user?.role === "teacher" && pendingExtensionRequests.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <CalendarPlus size={16} className="text-primary" />

            <h3 className="text-sm font-medium">
              Solicitudes de más plazo
            </h3>
          </div>

          <div className="divide-y divide-border">
            {pendingExtensionRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: request.subjectColor }}
                    />

                    <p className="text-sm font-medium text-foreground">
                      {request.assignment_title}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Estudiante: {request.student_name}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Nueva fecha solicitada: {formatDate(request.requested_due_date)}
                  </p>

                  <p className="text-xs text-foreground">
                    Motivo: {request.reason}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateExtensionRequest(request.id, "approved")}
                    className="px-3 py-2 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
                  >
                    Aprobar
                  </button>

                  <button
                    onClick={() => handleUpdateExtensionRequest(request.id, "rejected")}
                    className="px-3 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tareas..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="relative">
          <Filter
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="pl-8 pr-8 py-2 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
          >
            <option>Todas las asignaturas</option>

            {SUBJECT_LIST.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          <ChevronDown
            size={12}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
              statusFilter === f
                ? "bg-card shadow-sm text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Clock size={40} className="mx-auto text-muted-foreground/40 mb-3" />

            <p className="text-sm text-muted-foreground">
              Cargando tareas...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <FileText size={40} className="mx-auto text-muted-foreground/40 mb-3" />

            <p className="text-sm text-muted-foreground">
              No se encontraron tareas con estos filtros
            </p>
          </div>
        ) : (
          filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              user={user}
              onSelect={setSelectedTask}
              onSubmit={handleSubmit}
            />
          ))
        )}
      </div>

      {/* Modal Nueva Tarea */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateTask}
            className="bg-card w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4"
          >
            <h2 className="text-lg font-semibold">
              Crear Nueva Tarea
            </h2>

            <div>
              <label className="text-xs text-muted-foreground">
                Título
              </label>

              <input
                required
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full p-2 bg-muted rounded-lg text-sm border border-border"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">
                Asignatura
              </label>

              <select
                value={newTask.subject_id}
                onChange={(e) => setNewTask({ ...newTask, subject_id: e.target.value })}
                className="w-full p-2 bg-muted rounded-lg text-sm border border-border"
              >
                {SUBJECT_LIST.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">
                  Fecha Límite
                </label>

                <input
                  required
                  type="datetime-local"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="w-full p-2 bg-muted rounded-lg text-sm border border-border"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">
                  Puntos
                </label>

                <input
                  type="number"
                  value={newTask.points}
                  onChange={(e) => setNewTask({
                    ...newTask,
                    points: parseInt(e.target.value) || 0
                  })}
                  className="w-full p-2 bg-muted rounded-lg text-sm border border-border"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">
                Instrucciones
              </label>

              <textarea
                rows={3}
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full p-2 bg-muted rounded-lg text-sm border border-border resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">
                Archivo adjunto (Opcional)
              </label>

              <input
                type="file"
                onChange={(e) => setNewTask({
                  ...newTask,
                  file: e.target.files?.[0] || null
                })}
                className="w-full text-xs text-muted-foreground mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
              >
                Publicar Tarea
              </button>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 bg-muted text-foreground rounded-xl text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  user,
  onSelect,
  onSubmit
}: {
  task: Task;
  user?: { id: string; role: string };
  onSelect: (t: Task) => void;
  onSubmit: (id: string, f: DroppedFile) => void | Promise<void>;
}) {
  const { display, isUrgent } = useCountdown(task.dueDate);

  const [, drop] = useDrop(() => ({
    accept: "FILE",
    drop: (item: DroppedFile) => {
      if (user?.role !== "teacher") {
        onSubmit(task.id, item);
      }
    },
  }));

  const statusBorder = {
    submitted: "border-l-emerald-400",
    "due-soon": "border-l-amber-400",
    late: "border-l-red-500",
    pending: "border-l-slate-300",
  }[task.status];

  return (
    <div
      ref={drop as unknown as React.RefObject<HTMLDivElement>}
      className={`bg-card rounded-xl border border-border border-l-4 ${statusBorder} shadow-sm hover:shadow-md transition-all cursor-pointer`}
      onClick={() => onSelect(task)}
    >
      <div className="p-4 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: task.subjectColor }}
            />

            <span className="text-xs text-muted-foreground">
              {task.subject}
            </span>
          </div>

          <p className="text-sm font-medium text-foreground truncate">
            {task.title}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatusBadge status={task.status} />

            {task.status !== "submitted" && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono ${
                isUrgent
                  ? "bg-red-100 text-red-700 animate-pulse"
                  : task.status === "late"
                    ? "bg-red-50 text-red-600"
                    : "bg-slate-100 text-slate-600"
              }`}>
                {isUrgent && <Zap size={10} />}
                <Clock size={10} />
                {display}
              </span>
            )}

            {task.extensionStatus === "pending" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                <CalendarPlus size={10} /> Plazo solicitado
              </span>
            )}

            {task.extensionStatus === "approved" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700">
                <CheckCircle size={10} /> Plazo aprobado
              </span>
            )}

            <span className="text-xs text-muted-foreground">
              {task.points} pts
            </span>
          </div>
        </div>

        {(user?.role === "teacher" || task.status !== "submitted") && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(task);
            }}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-all ${
              user?.role === "teacher"
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : task.status === "late"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {user?.role === "teacher" ? (
              <>
                <Eye size={13} /> Revisar
              </>
            ) : (
              <>
                <Upload size={13} /> Entregar
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}