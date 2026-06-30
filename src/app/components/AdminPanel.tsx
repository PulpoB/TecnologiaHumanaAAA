import { useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, ImagePlus, Save, LogOut } from "lucide-react";
import { createWorker } from "tesseract.js";

const API_URL = "http://localhost:3001/api";

interface AdminPanelProps {
  user: { id: string; name: string; role: string };
  onLogout: () => void;
}

interface PersonForm {
  rut: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: string;
}

const defaultFormState: PersonForm = {
  rut: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  sex: "",
};

export function AdminPanel({ user, onLogout }: AdminPanelProps) {
  const [form, setForm] = useState<PersonForm>(defaultFormState);
  const [personType, setPersonType] = useState<"student" | "teacher">("student");
  const [tempPassword, setTempPassword] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Presiona Escanear carnet para comenzar.");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string>("");
  const [error, setError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleScanClick = () => {
    setError("");
    setSuccess("");
    fileInputRef.current?.click();
  };

  const normalizeDate = (value: string) => {
    const match = value.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/);
    if (!match) return "";
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  };

  const parseChileanCarnet = (text: string): Partial<PersonForm> => {
    const result: Partial<PersonForm> = {};
    const raw = text.replace(/\r/g, "\n").replace(/\t/g, " ").toUpperCase();
    const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
    const joined = lines.join(" ");

    const rutMatch = joined.match(/(\d{1,2}\.\d{3}\.\d{3}-[0-9K])/i)
      || joined.match(/(\d{7,8}-[0-9K])/i);
    if (rutMatch) {
      result.rut = rutMatch[1].replace(/\s+/g, "");
    }

    const dobMatch = joined.match(/(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/);
    if (dobMatch) {
      result.birthDate = normalizeDate(dobMatch[1]);
    }

    const sexMatch = joined.match(/\b(MASCULINO|FEMENINO|MASC|FEM|M|F|HOMBRE|MUJER)\b/i);
    if (sexMatch) {
      const code = sexMatch[1].toString();
      if (/MASC|HOMBRE|^M$/i.test(code)) result.sex = "Masculino";
      else if (/FEM|MUJER|^F$/i.test(code)) result.sex = "Femenino";
      else result.sex = code;
    }

    const nameLabel = lines.find((line) => /NOMBRE|NOMBRES/.test(line));
    if (nameLabel) {
      result.firstName = nameLabel.replace(/.*NOMBRE[S]?[:]?/i, "").trim();
    }

    const lastNameLabel = lines.find((line) => /APELLIDO|APELLIDOS/.test(line));
    if (lastNameLabel) {
      result.lastName = lastNameLabel.replace(/.*APELLIDO[S]?[:]?/i, "").trim();
    }

    if (!result.firstName || !result.lastName) {
      const candidate = lines.find((line) => /^[A-ZÁÉÍÓÚÜÑ ]{3,}$/.test(line) && !/NOMBRE|APELLIDO|RUT|RUN|NACIONALIDAD|SEXO|FECHA/.test(line));
      if (candidate) {
        const tokens = candidate.split(" ").filter(Boolean);
        if (tokens.length >= 2) {
          result.firstName = result.firstName || tokens.slice(0, -1).join(" ");
          result.lastName = result.lastName || tokens.slice(-1).join(" ");
        }
      }
    }

    return result;
  };

  const extractDataFromImage = async (file: File): Promise<Partial<PersonForm>> => {
    const worker = await createWorker({
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setStatus(`OCR: ${Math.round((m.progress || 0) * 100)}%`);
        }
      },
    });

    try {
      await worker.loadLanguage('spa');
      await worker.initialize('spa');
      const { data: { text } } = await worker.recognize(file);
      const extracted = parseChileanCarnet(text);
      return extracted;
    } catch (ocrError: any) {
      console.error('OCR error:', ocrError);
      setError('No se pudo procesar la imagen. Por favor corrige manualmente los datos.');
      return {};
    } finally {
      await worker.terminate();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona una imagen de carnet válida.");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setImageFile(file);
    setStatus("Procesando imagen...");
    setError("");
    setSuccess("");

    const extracted = await extractDataFromImage(file);
    setForm((prev) => ({ ...prev, ...extracted }));
    setStatus("Imagen lista. Revisa los datos y presiona Guardar.");
  };

  const handleFieldChange = (field: keyof PersonForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("rut", form.rut);
      formData.append("firstName", form.firstName);
      formData.append("lastName", form.lastName);
      formData.append("birthDate", form.birthDate);
      formData.append("sex", form.sex);
      formData.append("person_type", personType);
      formData.append("tempPassword", tempPassword);
      formData.append("created_by_admin", user.id);

      if (imageFile) {
        formData.append("document_image", imageFile);
      }

      const res = await fetch(`${API_URL}/admin/persons`, {
        method: "POST",
        body: formData,
      });

        const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar la persona.");
      }
      if (data.email) {
        setSuccess(`Persona guardada con éxito. Correo asignado: ${data.email}`);
      } else {
        setSuccess("Persona guardada con éxito.");
      }
      setStatus("Carga completada.");
      setForm(defaultFormState);
      setPersonType("student");
      setTempPassword("");
      setImageFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      setError(err.message || "Error al guardar.");
      setStatus("No se pudo guardar la persona.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Panel Admin</p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">Registro de Personas</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              Escanea un carnet, revisa la información extraída y guarda el registro como Profesor o Alumno.
            </p>
          </div>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <button
              type="button"
              onClick={handleScanClick}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Camera size={18} /> Escanear carnet
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="rounded-3xl border border-dashed border-border/80 bg-muted/80 p-4 min-h-[240px] flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} alt="Carnet" className="h-full w-full rounded-3xl object-contain" />
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  <ImagePlus size={44} className="mx-auto mb-3" />
                  Carga o toma una foto del carnet para ver la vista previa.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Estado</span>
                <span>{saving ? "Guardando..." : status}</span>
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              {success && (
                <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tipo de persona</label>
                <select
                  value={personType}
                  onChange={(e) => setPersonType(e.target.value as "student" | "teacher")}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="teacher">Profesor</option>
                  <option value="student">Alumno</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">RUT</label>
                <input
                  value={form.rut}
                  onChange={(e) => handleFieldChange("rut", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="11.111.111-1"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nombres</label>
                <input
                  value={form.firstName}
                  onChange={(e) => handleFieldChange("firstName", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Juan Pablo"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Apellidos</label>
                <input
                  value={form.lastName}
                  onChange={(e) => handleFieldChange("lastName", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="González Pérez"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Fecha de nacimiento</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => handleFieldChange("birthDate", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Sexo</label>
                <input
                  value={form.sex}
                  onChange={(e) => handleFieldChange("sex", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Masculino / Femenino"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-muted-foreground">Contraseña temporal</label>
              <input
                type="password"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Contraseña temporal"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} /> Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
