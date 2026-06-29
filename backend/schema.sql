-- Esquema para la plataforma de e-learning EduCampus

-- 1. Usuarios y Roles
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    rut VARCHAR(50),
    birth_date DATE,
    sex VARCHAR(20),
    document_image_url TEXT,
    must_change_password BOOLEAN DEFAULT 0,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student','teacher','admin')),
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Carreras Universitarias
CREATE TABLE IF NOT EXISTS careers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    total_credits INTEGER NOT NULL,
    duration_semesters INTEGER NOT NULL,
    faculty VARCHAR(150),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Perfiles de Usuario
CREATE TABLE IF NOT EXISTS student_profiles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL UNIQUE,
    career_id TEXT,
    enrollment_number VARCHAR(30) NOT NULL UNIQUE,
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 12),
    credits_completed INTEGER DEFAULT 0,
    gpa REAL DEFAULT 0.00,
    city VARCHAR(100),
    phone VARCHAR(20),
    bio TEXT,
    enrollment_date DATE,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (career_id) REFERENCES careers(id)
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL UNIQUE,
    title VARCHAR(50),
    department VARCHAR(150),
    phone VARCHAR(20),
    bio TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Asignaturas y Estructura Académica
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    career_id TEXT,
    credits INTEGER NOT NULL DEFAULT 3,
    color_hex VARCHAR(7) DEFAULT '#2563EB',
    semester INTEGER CHECK (semester BETWEEN 1 AND 12),
    hours_week INTEGER DEFAULT 3,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (career_id) REFERENCES careers(id)
);

CREATE TABLE IF NOT EXISTS subject_enrollments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    student_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    teacher_id TEXT,
    semester VARCHAR(20) NOT NULL,
    year INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','dropped','completed','failed')),
    final_grade REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    UNIQUE (student_id, subject_id, semester, year)
);

-- 5. Tareas y Entregas
CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    subject_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    due_date DATETIME NOT NULL,
    max_points REAL NOT NULL DEFAULT 10,
    allow_late_submission BOOLEAN DEFAULT 0,
    late_penalty_percent INTEGER DEFAULT 0 CHECK (late_penalty_percent BETWEEN 0 AND 100),
    max_file_size_mb INTEGER DEFAULT 50,
    allowed_file_types TEXT DEFAULT 'pdf,docx,zip,png,jpg',
    status TEXT CHECK(status IN ('draft','published','closed')) DEFAULT 'published',
    instructions_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    assignment_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_kb INTEGER NOT NULL,
    file_type VARCHAR(50),
    is_late BOOLEAN DEFAULT 0,
    attempt_number INTEGER DEFAULT 1,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    status TEXT CHECK(status IN ('submitted','graded','late','resubmitted')) DEFAULT 'submitted',
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id),
    UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS submission_grades (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    submission_id TEXT NOT NULL UNIQUE,
    graded_by TEXT NOT NULL,
    grade REAL NOT NULL CHECK (grade >= 0),
    feedback TEXT,
    rubric_notes TEXT,
    graded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id)
);

-- 6. Evaluaciones
CREATE TABLE IF NOT EXISTS evaluation_types (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    subject_id TEXT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type TEXT CHECK(type IN ('parcial','quiz','tarea','proyecto','laboratorio','final')),
    weight REAL NOT NULL,
    max_grade REAL DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    evaluation_type_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    grade REAL CHECK (grade >= 0),
    max_grade REAL DEFAULT 10,
    feedback TEXT,
    is_published BOOLEAN DEFAULT 0,
    eval_date DATE,
    graded_by TEXT,
    graded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (evaluation_type_id) REFERENCES evaluation_types(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id),
    UNIQUE (evaluation_type_id, student_id)
);

-- 7. Materiales y Recursos
CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    subject_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    type TEXT CHECK(type IN ('pdf','video','link','doc','zip','image','code')),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size_kb INTEGER,
    duration_secs INTEGER,
    thumbnail_url TEXT,
    views_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS material_views (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    material_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (material_id, student_id)
);

CREATE TABLE IF NOT EXISTS material_stars (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    material_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (material_id, student_id)
);

-- Datos de ejemplo iniciales (Fijos para el usuario de demo)
INSERT OR IGNORE INTO users (id, name, email, password_hash, role) 
VALUES ('u1', 'Carlos Eduardo Ramírez Torres', 'carlos.ramirez@universidad.edu.mx', 'hash123', 'student');

INSERT OR IGNORE INTO careers (id, name, code, total_credits, duration_semesters) 
VALUES ('c1', 'Ingeniería en Sistemas Computacionales', 'ISC', 450, 9);

INSERT OR IGNORE INTO student_profiles (user_id, career_id, enrollment_number, semester, gpa, credits_completed, phone, city, bio)
VALUES ('u1', 'c1', '2021-ISC-4782', 6, 9.2, 240, '+52 55 1234 5678', 'Ciudad de México, México', 'Estudiante apasionado por el desarrollo web.');

INSERT OR IGNORE INTO subjects (id, name, code, color_hex, career_id, semester) VALUES 
('s1', 'Programación Web', 'PW-2026', '#2563EB', 'c1', 6),
('s2', 'Economía Internacional', 'EI-2026', '#8B5CF6', 'c1', 6);

-- Docente de ejemplo
INSERT OR IGNORE INTO users (id, name, email, password_hash, role) 
VALUES ('u2', 'Ing. Carlos López', 'c.lopez@universidad.edu.mx', 'hash456', 'teacher');

INSERT OR IGNORE INTO teacher_profiles (user_id, title, department)
VALUES ('u2', 'Ingeniero de Software', 'Departamento de Computación');

-- Tareas de ejemplo
INSERT OR IGNORE INTO subject_enrollments (id, student_id, subject_id, teacher_id, semester, year, status)
VALUES 
('se1', 'u1', 's1', 'u2', '2026-1', 2026, 'active'),
('se2', 'u1', 's2', 'u2', '2026-1', 2026, 'active');

INSERT OR IGNORE INTO assignments (id, title, description, subject_id, teacher_id, due_date, max_points, status)
VALUES 
('a1', 'Proyecto Final: Sistema MVC', 'Desarrollar una aplicación web completa usando el patrón MVC con Node.js y SQLite.', 's1', 'u2', '2026-06-21 23:59:59', 50, 'published'),
('a2', 'Ensayo: Tipos de Cambio', 'Redactar un análisis sobre la fluctuación del peso frente al dólar en el último trimestre.', 's2', 'u2', '2026-06-15 12:00:00', 20, 'published');

INSERT OR IGNORE INTO evaluation_types (id, subject_id, name, type, weight, max_grade)
VALUES 
('et1', 's1', 'Parcial 1', 'parcial', 30, 10),
('et2', 's1', 'Quiz JS Avanzado', 'quiz', 15, 10),
('et3', 's1', 'Proyecto Final', 'proyecto', 35, 10),
('et4', 's2', 'Parcial 1', 'parcial', 30, 10),
('et5', 's2', 'Quiz de Mercado', 'quiz', 15, 10),
('et6', 's2', 'Ensayo Final', 'tarea', 25, 10);

INSERT OR IGNORE INTO evaluations (id, evaluation_type_id, student_id, grade, max_grade, feedback, is_published, eval_date, graded_by, graded_at)
VALUES 
('ev1', 'et1', 'u1', 8.7, 10, 'Buen manejo de fundamentos básicos.', 1, '2026-06-01', 'u2', '2026-06-02'),
('ev2', 'et2', 'u1', 9.1, 10, 'Excelente comprensión de JavaScript.', 1, '2026-06-08', 'u2', '2026-06-09'),
('ev3', 'et3', 'u1', NULL, 10, '', 0, '2026-06-22', NULL, NULL),
('ev4', 'et4', 'u1', 8.3, 10, 'Análisis sólido del contexto internacional.', 1, '2026-06-03', 'u2', '2026-06-04'),
('ev5', 'et5', 'u1', 8.8, 10, 'Buena interpretación de indicadores.', 1, '2026-06-10', 'u2', '2026-06-11'),
('ev6', 'et6', 'u1', NULL, 10, '', 0, '2026-06-20', NULL, NULL);