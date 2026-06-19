import { useState, useEffect, useCallback } from "react";
import {
  BookOpen, Search, Filter, Download, ExternalLink, Play,
  File, FileText, Image, FileCode, Link2, Video, ChevronDown,
  Folder, Star, Clock, Eye, Plus, X, Upload
} from "lucide-react";

interface Material {
  id: string;
  title: string;
  subject: string;
  subjectColor: string;
  type: "pdf" | "doc" | "video" | "link" | "image" | "code" | "zip";
  description: string;
  size?: string;
  duration?: string;
  url: string;
  uploadedAt: Date | string;
  isStarred: boolean;
  views: number;
  teacher: string;
}

const API_URL = "http://localhost:3001/api";

const TYPE_ICONS: Record<Material["type"], React.ElementType> = {
  pdf: FileText,
  doc: File,
  video: Video,
  link: Link2,
  image: Image,
  code: FileCode,
  zip: Folder,
};

const TYPE_COLORS: Record<Material["type"], string> = {
  pdf: "bg-red-50 text-red-600",
  doc: "bg-blue-50 text-blue-600",
  video: "bg-purple-50 text-purple-600",
  link: "bg-green-50 text-green-600",
  image: "bg-orange-50 text-orange-600",
  code: "bg-slate-100 text-slate-600",
  zip: "bg-amber-50 text-amber-600",
};

const TYPE_LABELS: Record<Material["type"], string> = {
  pdf: "PDF",
  doc: "Documento",
  video: "Video",
  link: "Enlace",
  image: "Imagen",
  code: "Código",
  zip: "Archivo",
};

const SUBJECT_LIST = [
  { id: 's1', name: "Programación Web" },
  { id: 's2', name: "Economía Internacional" }
];

const TYPE_FILTERS = ["Todos", "PDF", "Video", "Enlace", "Documento", "Archivo"];

function formatRelativeDate(d: Date | string) {
  const date = d instanceof Date ? d : new Date(d);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return `Hace ${diffDays} días`;
}

interface MaterialsProps {
  user?: { id: string, role: string };
}

export function Materials({ user }: MaterialsProps) {
  const [mats, setMats] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState<{title: string, description: string, subject_id: string, type: Material["type"], url: string, file: File | null}>({ title: "", description: "", subject_id: "s1", type: "pdf", url: "#", file: null });

  const [subject, setSubject] = useState("Todas las asignaturas");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "name">("recent");

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/materials`);
      const data = await res.json();
      setMats(data);
    } catch (err) {
      console.error("Error al cargar materiales:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("title", newMaterial.title);
    formData.append("description", newMaterial.description);
    formData.append("subject_id", newMaterial.subject_id);
    formData.append("teacher_id", user?.id || 'u2');
    formData.append("type", newMaterial.type);
    if (newMaterial.file) {
      formData.append("file", newMaterial.file);
    } else {
      formData.append("url", newMaterial.url);
    }

    try {
      const res = await fetch(`${API_URL}/materials`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        setShowCreateModal(false);
        fetchMaterials();
      }
    } catch (err) {
      console.error("Error al crear material:", err);
    }
  };

  const toggleStar = (id: string) => {
    setMats((prev) => prev.map((m) => {
      if (m.id === id) {
        return { 
          ...m, 
          isStarred: !m.isStarred,
          uploadedAt: m.uploadedAt
        };
      }
      return m;
    }));
  };

  const filtered = mats.filter((m) => {
    const matchSub = subject === "Todas las asignaturas" || m.subject === subject;
    const matchType =
      typeFilter === "Todos" ||
      (typeFilter === "PDF" && m.type === "pdf") ||
      (typeFilter === "Video" && m.type === "video") ||
      (typeFilter === "Enlace" && m.type === "link") ||
      (typeFilter === "Documento" && m.type === "doc") ||
      (typeFilter === "Archivo" && m.type === "zip");
    const matchSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.subject.toLowerCase().includes(search.toLowerCase()) ||
      m.teacher.toLowerCase().includes(search.toLowerCase());
    return matchSub && matchType && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.uploadedAt).getTime();
    const dateB = new Date(b.uploadedAt).getTime();
    if (sortBy === "recent") return dateB - dateA;
    if (sortBy === "popular") return b.views - a.views;
    return a.title.localeCompare(b.title);
  });

  // Group by subject for display
  const bySubject = sorted.reduce<Record<string, Material[]>>((acc, m) => {
    if (!acc[m.subject]) acc[m.subject] = [];
    acc[m.subject].push(m);
    return acc;
  }, {});

  const showGrouped = subject === "Todas las asignaturas" && search === "" && typeFilter === "Todos";

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1>Materiales</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{mats.length} recursos disponibles</p>
        </div>
        {user?.role === 'teacher' && (
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-xl hover:opacity-90 transition-opacity">
            <Plus size={15} /> Subir material
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar materiales, asignaturas, docentes..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="relative">
          <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="pl-8 pr-8 py-2 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
          >
            <option>Todas las asignaturas</option>
            {SUBJECT_LIST.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="pl-3 pr-8 py-2 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
          >
            <option value="recent">Más recientes</option>
            <option value="popular">Más vistos</option>
            <option value="name">A-Z</option>
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit flex-wrap">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
              typeFilter === f ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? ( <div className="text-center py-12 text-muted-foreground italic">Cargando recursos...</div> ) : sorted.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <BookOpen size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No se encontraron materiales con estos filtros</p>
        </div>
      ) : showGrouped ? (
        <div className="space-y-6">
          {Object.entries(bySubject).map(([subj, items]) => {
            const color = items[0].subjectColor;
            return (
              <div key={subj}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <h3 className="text-sm">{subj}</h3>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                <div className="grid gap-3">
                  {items.map((m) => <MaterialCard key={m.id} material={m} onToggleStar={toggleStar} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3">
          {sorted.map((m) => <MaterialCard key={m.id} material={m} onToggleStar={toggleStar} />)}
        </div>
      )}

      {/* Modal Nuevo Material */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateMaterial} className="bg-card w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">Subir Nuevo Material</h2>
            <div>
              <label className="text-xs text-muted-foreground">Título del recurso</label>
              <input required value={newMaterial.title} onChange={e => setNewMaterial({...newMaterial, title: e.target.value})} className="w-full p-2 bg-muted rounded-lg text-sm border border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Asignatura</label>
                <select value={newMaterial.subject_id} onChange={e => setNewMaterial({...newMaterial, subject_id: e.target.value})} className="w-full p-2 bg-muted rounded-lg text-sm border border-border">
                  {SUBJECT_LIST.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tipo</label>
                <select value={newMaterial.type} onChange={e => setNewMaterial({...newMaterial, type: e.target.value as Material["type"]})} className="w-full p-2 bg-muted rounded-lg text-sm border border-border">
                  {Object.keys(TYPE_LABELS).map(k => <option key={k} value={k}>{TYPE_LABELS[k as Material["type"]]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Subir archivo local</label>
              <input 
                type="file" 
                onChange={e => setNewMaterial({...newMaterial, file: e.target.files?.[0] || null})}
                className="w-full text-xs text-muted-foreground mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              <div className="flex items-center gap-2 my-2"><div className="flex-1 h-px bg-border"></div><span className="text-[10px] text-muted-foreground">O URL EXTERNA</span><div className="flex-1 h-px bg-border"></div></div>
              <input value={newMaterial.url} onChange={e => setNewMaterial({...newMaterial, url: e.target.value})} className="w-full p-2 bg-muted rounded-lg text-sm border border-border" placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Descripción</label>
              <textarea rows={3} value={newMaterial.description} onChange={e => setNewMaterial({...newMaterial, description: e.target.value})} className="w-full p-2 bg-muted rounded-lg text-sm border border-border resize-none" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                <Upload size={14} /> Publicar Material
              </button>
              <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2 bg-muted text-foreground rounded-xl text-sm font-medium">Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function MaterialCard({ material: m, onToggleStar }: { material: Material; onToggleStar: (id: string) => void }) {
  const Icon = TYPE_ICONS[m.type];
  const typeColor = TYPE_COLORS[m.type];

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColor}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{TYPE_LABELS[m.type]}</span>
              <span className="text-xs text-muted-foreground">{m.teacher}</span>
              {m.isStarred && <Star size={11} className="text-amber-500 fill-amber-500" />}
            </div>
            <p className="text-sm font-medium text-foreground mt-0.5 leading-snug">{m.title}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.description}</p>
          </div>
          <button
            onClick={() => onToggleStar(m.id)}
            className={`flex-shrink-0 p-1 rounded hover:bg-amber-50 transition-colors ${m.isStarred ? "text-amber-500" : "text-muted-foreground"}`}
          >
            <Star size={14} className={m.isStarred ? "fill-current" : ""} />
          </button>
        </div>
        <div className="flex items-center gap-3 mt-2.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={11} /> {formatRelativeDate(m.uploadedAt)}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye size={11} /> {m.views} vistas
          </span>
          {m.size && <span className="text-xs text-muted-foreground">{m.size}</span>}
          {m.duration && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Play size={10} /> {m.duration}
            </span>
          )}
          <div className="flex-1" />
          {m.type === "link" ? (
            <a
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink size={12} /> Abrir enlace
            </a>
          ) : (
            <a 
              href={m.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Download size={12} /> Descargar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
