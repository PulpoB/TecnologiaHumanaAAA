const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const port = 3001;
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'institucion.cl';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Crear carpeta de uploads si no existe
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Configuración de Multer para almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Rutas de archivos - Usamos path.join(__dirname) para que sea relativo a esta carpeta
const dbPath = path.join(__dirname, 'educampus.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Conexión e inicialización de la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar:', err.message);
        process.exit(1);
    }
    console.log('Conectado a la base de datos SQLite.');
});

db.run('PRAGMA foreign_keys = ON');

const ensureUserColumns = () => new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(users)', [], (err, rows) => {
        if (err) return reject(err);

        const existingColumns = rows.map((row) => row.name);
        const missing = [];

        if (!existingColumns.includes('rut')) {
            missing.push("ALTER TABLE users ADD COLUMN rut VARCHAR(50)");
        }
        if (!existingColumns.includes('birth_date')) {
            missing.push("ALTER TABLE users ADD COLUMN birth_date DATE");
        }
        if (!existingColumns.includes('sex')) {
            missing.push("ALTER TABLE users ADD COLUMN sex VARCHAR(20)");
        }
        if (!existingColumns.includes('document_image_url')) {
            missing.push("ALTER TABLE users ADD COLUMN document_image_url TEXT");
        }
        if (!existingColumns.includes('must_change_password')) {
            missing.push("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0");
        }

        if (!missing.length) {
            return resolve();
        }

        db.serialize(() => {
            let completed = 0;
            missing.forEach((sql) => {
                db.run(sql, (alterErr) => {
                    if (alterErr) {
                        console.error('Error al alterar tabla users:', alterErr.message);
                        return reject(alterErr);
                    }
                    completed += 1;
                    if (completed === missing.length) {
                        resolve();
                    }
                });
            });
        });
    });
});

// Crear tabla para solicitudes de más plazo si no existe
const ensureDeadlineExtensionTable = () => new Promise((resolve, reject) => {
    const sql = `
        CREATE TABLE IF NOT EXISTS deadline_extension_requests (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            assignment_id TEXT NOT NULL,
            student_id TEXT NOT NULL,
            teacher_id TEXT NOT NULL,
            reason TEXT NOT NULL,
            requested_due_date DATETIME NOT NULL,
            status TEXT CHECK(status IN ('pending','approved','rejected')) DEFAULT 'pending',
            teacher_response TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `;

    db.run(sql, (err) => {
        if (err) {
            console.error('Error creando tabla deadline_extension_requests:', err.message);
            reject(err);
            return;
        }
        console.log('Tabla deadline_extension_requests lista.');
        resolve();
    });
});

// Crear tabla para revisiones/retroalimentación si no existe
const ensureSubmissionGradesTable = () => new Promise((resolve, reject) => {
    const sql = `
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
    `;

    db.run(sql, (err) => {
        if (err) {
            console.error('Error creando tabla submission_grades:', err.message);
            reject(err);
            return;
        }
        console.log('Tabla submission_grades lista.');
        resolve();
    });
});

const initializeDatabase = () => new Promise((resolve, reject) => {
    if (!fs.existsSync(schemaPath)) {
        resolve();
        return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error al cargar el esquema:', err.message);
            reject(err);
            return;
        }

        ensureUserColumns().then(() => {
            const hashStudent = bcrypt.hashSync('hash123', 10);
            const hashTeacher = bcrypt.hashSync('hash456', 10);
            const hashAdmin = bcrypt.hashSync('admin123', 10);

            const seedSql = `
                INSERT OR IGNORE INTO users (id, name, email, password_hash, role, must_change_password) VALUES
                    ('u1', 'Carlos Eduardo Ramírez Torres', 'carlos.ramirez@universidad.edu.mx', '${hashStudent}', 'student', 0),
                    ('u2', 'Ing. Carlos López', 'c.lopez@universidad.edu.mx', '${hashTeacher}', 'teacher', 0),
                    ('u3', 'Admin Central', 'admin@universidad.edu.mx', '${hashAdmin}', 'admin', 0);

                INSERT OR IGNORE INTO careers (id, name, code, total_credits, duration_semesters) VALUES
                    ('c1', 'Ingeniería en Sistemas Computacionales', 'ISC', 450, 9);

                INSERT OR IGNORE INTO student_profiles (user_id, career_id, enrollment_number, semester, gpa, credits_completed, phone, city, bio) VALUES
                    ('u1', 'c1', '2021-ISC-4782', 6, 9.2, 240, '+52 55 1234 5678', 'Ciudad de México, México', 'Estudiante apasionado por el desarrollo web.');

                INSERT OR IGNORE INTO teacher_profiles (user_id, title, department) VALUES
                    ('u2', 'Ingeniero de Software', 'Departamento de Computación');

                INSERT OR IGNORE INTO subjects (id, name, code, color_hex, career_id, semester) VALUES
                    ('s1', 'Programación Web', 'PW-2026', '#2563EB', 'c1', 6),
                    ('s2', 'Economía Internacional', 'EI-2026', '#8B5CF6', 'c1', 6);

                INSERT OR IGNORE INTO subject_enrollments (id, student_id, subject_id, teacher_id, semester, year, status) VALUES
                    ('se1', 'u1', 's1', 'u2', '2026-1', 2026, 'active'),
                    ('se2', 'u1', 's2', 'u2', '2026-1', 2026, 'active');

                INSERT OR IGNORE INTO assignments (id, title, description, subject_id, teacher_id, due_date, max_points, status) VALUES
                    ('a1', 'Proyecto Final: Sistema MVC', 'Desarrollar una aplicación web completa usando el patrón MVC con Node.js y SQLite.', 's1', 'u2', '2026-06-21 23:59:59', 50, 'published'),
                    ('a2', 'Ensayo: Tipos de Cambio', 'Redactar un análisis sobre la fluctuación del peso frente al dólar en el último trimestre.', 's2', 'u2', '2026-06-15 12:00:00', 20, 'published');

                INSERT OR IGNORE INTO evaluation_types (id, subject_id, name, type, weight, max_grade) VALUES
                    ('et1', 's1', 'Parcial 1', 'parcial', 30, 10),
                    ('et2', 's1', 'Quiz JS Avanzado', 'quiz', 15, 10),
                    ('et3', 's1', 'Proyecto Final', 'proyecto', 35, 10),
                    ('et4', 's2', 'Parcial 1', 'parcial', 30, 10),
                    ('et5', 's2', 'Quiz de Mercado', 'quiz', 15, 10),
                    ('et6', 's2', 'Ensayo Final', 'tarea', 25, 10);

                INSERT OR IGNORE INTO evaluations (id, evaluation_type_id, student_id, grade, max_grade, feedback, is_published, eval_date, graded_by, graded_at) VALUES
                    ('ev1', 'et1', 'u1', 8.7, 10, 'Buen manejo de fundamentos básicos.', 1, '2026-06-01', 'u2', '2026-06-02'),
                    ('ev2', 'et2', 'u1', 9.1, 10, 'Excelente comprensión de JavaScript.', 1, '2026-06-08', 'u2', '2026-06-09'),
                    ('ev3', 'et3', 'u1', NULL, 10, '', 0, '2026-06-22', NULL, NULL),
                    ('ev4', 'et4', 'u1', 8.3, 10, 'Análisis sólido del contexto internacional.', 1, '2026-06-03', 'u2', '2026-06-04'),
                    ('ev5', 'et5', 'u1', 8.8, 10, 'Buena interpretación de indicadores.', 1, '2026-06-10', 'u2', '2026-06-11'),
                    ('ev6', 'et6', 'u1', NULL, 10, '', 0, '2026-06-20', NULL, NULL);

                -- Reparación obligatoria de usuarios demo: si la base ya existía y u1 quedó con correo malo,
                -- esto lo corrige cada vez que inicia el backend.
                DELETE FROM users
                WHERE email = 'carlos.ramirez@universidad.edu.mx'
                  AND id <> 'u1';

                INSERT OR IGNORE INTO users
                (id, name, email, password_hash, role, must_change_password, is_active)
                VALUES
                ('u1', 'Carlos Eduardo Ramírez Torres', 'carlos.ramirez@universidad.edu.mx', '${hashStudent}', 'student', 0, 1);

                UPDATE users
                SET name = 'Carlos Eduardo Ramírez Torres',
                    email = 'carlos.ramirez@universidad.edu.mx',
                    password_hash = '${hashStudent}',
                    role = 'student',
                    must_change_password = 0,
                    is_active = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = 'u1';

                DELETE FROM users
                WHERE email = 'c.lopez@universidad.edu.mx'
                  AND id <> 'u2';

                INSERT OR IGNORE INTO users
                (id, name, email, password_hash, role, must_change_password, is_active)
                VALUES
                ('u2', 'Ing. Carlos López', 'c.lopez@universidad.edu.mx', '${hashTeacher}', 'teacher', 0, 1);

                UPDATE users
                SET name = 'Ing. Carlos López',
                    email = 'c.lopez@universidad.edu.mx',
                    password_hash = '${hashTeacher}',
                    role = 'teacher',
                    must_change_password = 0,
                    is_active = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = 'u2';

                DELETE FROM users
                WHERE email = 'admin@universidad.edu.mx'
                  AND id <> 'u3';

                INSERT OR IGNORE INTO users
                (id, name, email, password_hash, role, must_change_password, is_active)
                VALUES
                ('u3', 'Admin Central', 'admin@universidad.edu.mx', '${hashAdmin}', 'admin', 0, 1);

                UPDATE users
                SET name = 'Admin Central',
                    email = 'admin@universidad.edu.mx',
                    password_hash = '${hashAdmin}',
                    role = 'admin',
                    must_change_password = 0,
                    is_active = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = 'u3';
            `;

            db.exec(seedSql, (seedErr) => {
                if (seedErr) {
                    console.error('Error al insertar datos demo:', seedErr.message);
                    reject(seedErr);
                    return;
                }
                console.log('Esquema cargado correctamente y datos demo asegurados.');
                resolve();
            });
        }).catch((columnErr) => {
            console.error('Error al asegurar columnas de usuario:', columnErr.message);
            reject(columnErr);
        });
    });
});

// --- ENDPOINTS API ---

// 0. Login (Simulado para este ejemplo)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = `SELECT id, name, email, role, avatar_url, password_hash, must_change_password FROM users WHERE email = ?`;

    db.get(sql, [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

        const passwordHash = user.password_hash || '';
        const isBcryptHash = passwordHash.startsWith('$2a$') || passwordHash.startsWith('$2b$');
        const isValid = isBcryptHash
            ? bcrypt.compareSync(password, passwordHash)
            : password === passwordHash;

        if (!isValid) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        console.log(`>>> Usuario autenticado: ${user.name} (${user.role})`);
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar_url: user.avatar_url,
            must_change_password: Boolean(user.must_change_password)
        });
    });
});

// 1. Registrar persona desde Admin
app.post('/api/admin/persons', upload.single('document_image'), (req, res) => {
    const {
        rut,
        firstName,
        lastName,
        birthDate,
        sex,
        person_type,
        tempPassword,
        created_by_admin
    } = req.body;

    if (!created_by_admin) {
        return res.status(400).json({ error: 'created_by_admin es requerido' });
    }

    if (!firstName || !lastName || !birthDate || !sex || !tempPassword) {
        return res.status(400).json({ error: 'Debe proporcionar nombres, apellidos, fecha de nacimiento, sexo y contraseña temporal.' });
    }

    const url = req.file ? `http://localhost:3001/uploads/${req.file.filename}` : null;
    const role = person_type === 'teacher' ? 'teacher' : 'student';

    const sqlAdmin = `SELECT id, role FROM users WHERE id = ?`;
    db.get(sqlAdmin, [created_by_admin], (err, admin) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ error: 'Solo un admin puede registrar personas' });
        }

        const sanitizeBase = (value) =>
            value
                .normalize('NFD')
                .replace(/\p{Diacritic}/gu, '')
                .replace(/[^a-zA-Z0-9]/g, '')
                .toLowerCase();

        const firstInitial = sanitizeBase(firstName.trim().charAt(0));
        const lastPart = sanitizeBase(lastName.trim().replace(/\s+/g, ''));
        const baseEmail = `${firstInitial}${lastPart}`;
        const domain = EMAIL_DOMAIN;
        const likePattern = `${baseEmail}%@${domain}`;

        db.all(`SELECT email FROM users WHERE email LIKE ?`, [likePattern], (emailErr, rows) => {
            if (emailErr) return res.status(500).json({ error: emailErr.message });

            const existingEmails = new Set(rows.map((row) => row.email.toLowerCase()));
            let emailCandidate = `${baseEmail}@${domain}`;
            let counter = 1;

            while (existingEmails.has(emailCandidate)) {
                emailCandidate = `${baseEmail}${counter}@${domain}`;
                counter += 1;
            }

            const passwordHash = bcrypt.hashSync(tempPassword, 10);
            const name = `${firstName.trim()} ${lastName.trim()}`;

            const sql = `
                INSERT INTO users (
                    name, email, password_hash, role,
                    rut, birth_date, sex, document_image_url,
                    must_change_password
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`;

            db.run(sql, [
                name,
                emailCandidate,
                passwordHash,
                role,
                rut || null,
                birthDate || null,
                sex || null,
                url
            ], function(insertErr) {
                if (insertErr) return res.status(500).json({ error: insertErr.message });
                res.json({ success: true, email: emailCandidate, id: this.lastID });
            });
        });
    });
});

// 1. Obtener Perfil de Usuario
app.get('/api/profile', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId es requerido" });
    
    const sql = `
        SELECT u.name, u.email, u.avatar_url, u.role,
               sp.phone, sp.city, sp.bio, sp.semester, car.name as career,
               tp.title, tp.department
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN careers car ON sp.career_id = car.id
        LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
        WHERE u.id = ?`;

    db.get(sql, [userId], (err, row) => {
        if (err) {
            console.error('XXX Error al obtener perfil:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('vvv Perfil enviado al cliente.');
        res.json(row);
    });
});

// Actualizar Perfil (id 'u1' fijo para este ejemplo)
app.put('/api/profile', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId es requerido" });
    const { name, email, phone, city, bio } = req.body;
    console.log(`>>> [DB] Actualizando perfil para: ${userId}`);
    
    db.serialize(() => {
        db.run('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, userId], (err) => {
            if (err) console.error('Error al actualizar tabla users:', err.message);
        });

        db.run('UPDATE student_profiles SET phone = ?, city = ?, bio = ? WHERE user_id = ?', [phone, city, bio, userId], function(err) {
            if (err) {
                console.error('XXX [DB] Error en student_profiles:', err.message);
                return res.status(500).json({ error: err.message });
            }
            console.log('vvv [DB] Perfil guardado con éxito. Filas afectadas:', this.changes);
            res.json({ success: true });
        });
    });
});

// 2. Obtener todas las Asignaturas
app.get('/api/subjects', (req, res) => {
    console.log('>>> Consultando asignaturas...');
    db.all('SELECT *, color_hex as color FROM subjects', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 3. Obtener Tareas
app.get('/api/tasks', (req, res) => {
    const userId = req.query.userId;

    if (!userId) return res.status(400).json({ error: "userId es requerido" });

    db.get('SELECT role FROM users WHERE id = ?', [userId], (userErr, user) => {
        if (userErr) return res.status(500).json({ error: userErr.message });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const isTeacher = user.role === 'teacher';

        const sql = isTeacher
            ? `
                SELECT 
                    a.*,
                    strftime('%Y-%m-%dT%H:%M:%SZ', a.due_date) as due_date,
                    s.name as subject,
                    s.color_hex as subjectColor,
                    a.max_points as points,

                    sub.id as submissionId,
                    sub.id as submission_id,
                    sub.student_id as studentId,
                    sub.student_id as student_id,
                    stu.name as studentName,
                    stu.name as student_name,
                    sub.status as submission_status,
                    sub.file_name as submitted_file,
                    sub.file_name as submittedFile,
                    sub.file_url as submitted_url,
                    sub.file_url as submittedUrl,
                    strftime('%Y-%m-%dT%H:%M:%SZ', sub.submitted_at) as submitted_at,
                    strftime('%Y-%m-%dT%H:%M:%SZ', sub.submitted_at) as submittedAt,

                    sg.feedback as teacherFeedback,
                    sg.feedback as teacher_feedback,
                    sg.grade as teacherGrade,
                    sg.grade as teacher_grade,
                    CASE 
                        WHEN sg.id IS NOT NULL THEN 'reviewed'
                        WHEN sub.id IS NOT NULL THEN 'pending_review'
                        ELSE 'not_submitted'
                    END as reviewStatus,
                    CASE 
                        WHEN sg.id IS NOT NULL THEN 'reviewed'
                        WHEN sub.id IS NOT NULL THEN 'pending_review'
                        ELSE 'not_submitted'
                    END as review_status,

                    der.status as extensionStatus,
                    der.status as extension_status
                FROM assignments a
                JOIN subjects s 
                    ON a.subject_id = s.id
                LEFT JOIN submissions sub
                    ON a.id = sub.assignment_id
                LEFT JOIN users stu
                    ON sub.student_id = stu.id
                LEFT JOIN submission_grades sg
                    ON sg.submission_id = sub.id
                LEFT JOIN deadline_extension_requests der
                    ON der.assignment_id = a.id
                   AND der.student_id = sub.student_id
                   AND der.id = (
                        SELECT der2.id
                        FROM deadline_extension_requests der2
                        WHERE der2.assignment_id = a.id
                          AND der2.student_id = sub.student_id
                        ORDER BY der2.created_at DESC
                        LIMIT 1
                   )
                WHERE a.teacher_id = ?
                ORDER BY a.due_date ASC, stu.name ASC
            `
            : `
                SELECT 
                    a.*,
                    strftime('%Y-%m-%dT%H:%M:%SZ', a.due_date) as due_date,
                    s.name as subject,
                    s.color_hex as subjectColor,
                    a.max_points as points,

                    sub.id as submissionId,
                    sub.id as submission_id,
                    sub.student_id as studentId,
                    sub.student_id as student_id,
                    stu.name as studentName,
                    stu.name as student_name,
                    sub.status as submission_status,
                    sub.file_name as submitted_file,
                    sub.file_name as submittedFile,
                    sub.file_url as submitted_url,
                    sub.file_url as submittedUrl,
                    strftime('%Y-%m-%dT%H:%M:%SZ', sub.submitted_at) as submitted_at,
                    strftime('%Y-%m-%dT%H:%M:%SZ', sub.submitted_at) as submittedAt,

                    sg.feedback as teacherFeedback,
                    sg.feedback as teacher_feedback,
                    sg.grade as teacherGrade,
                    sg.grade as teacher_grade,
                    CASE 
                        WHEN sg.id IS NOT NULL THEN 'reviewed'
                        WHEN sub.id IS NOT NULL THEN 'pending_review'
                        ELSE 'not_submitted'
                    END as reviewStatus,
                    CASE 
                        WHEN sg.id IS NOT NULL THEN 'reviewed'
                        WHEN sub.id IS NOT NULL THEN 'pending_review'
                        ELSE 'not_submitted'
                    END as review_status,

                    der.status as extensionStatus,
                    der.status as extension_status
                FROM assignments a
                JOIN subjects s 
                    ON a.subject_id = s.id
                LEFT JOIN submissions sub 
                    ON a.id = sub.assignment_id 
                   AND sub.student_id = ?
                LEFT JOIN users stu
                    ON sub.student_id = stu.id
                LEFT JOIN submission_grades sg
                    ON sg.submission_id = sub.id
                LEFT JOIN deadline_extension_requests der
                    ON der.assignment_id = a.id
                   AND der.student_id = ?
                   AND der.id = (
                        SELECT der2.id
                        FROM deadline_extension_requests der2
                        WHERE der2.assignment_id = a.id
                          AND der2.student_id = ?
                        ORDER BY der2.created_at DESC
                        LIMIT 1
                   )
                WHERE EXISTS (
                    SELECT 1
                    FROM subject_enrollments se
                    WHERE se.student_id = ?
                      AND se.subject_id = a.subject_id
                )
                ORDER BY a.due_date ASC
            `;

        const params = isTeacher
            ? [userId]
            : [userId, userId, userId, userId];

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Error en /api/tasks:', err.message);
                return res.status(500).json({ error: err.message });
            }

            const mappedTasks = rows.map(task => ({
                ...task,
                color: task.subjectColor,
                status: task.submission_status ? 'submitted' : 'pending'
            }));

            res.json(mappedTasks);
        });
    });
});

// Crear nueva Tarea (Solo Profesores)
app.post('/api/tasks', upload.single('file'), (req, res) => {
    const { title, description, subject_id, teacher_id, due_date, points } = req.body;
    const fileUrl = req.file ? `http://localhost:3001/uploads/${req.file.filename}` : null;

    const sql = `INSERT INTO assignments (title, description, subject_id, teacher_id, due_date, max_points, status, instructions_url) 
                 VALUES (?, ?, ?, ?, ?, ?, 'published', ?)`;
    
    db.run(sql, [title, description, subject_id, teacher_id, due_date, points, fileUrl], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

// Solicitar más plazo para una tarea
app.post('/api/tasks/:id/extension-request', (req, res) => {
    const assignmentId = req.params.id;
    const { studentId, reason, requestedDueDate } = req.body;

    if (!studentId || !reason || !requestedDueDate) {
        return res.status(400).json({
            error: 'studentId, reason y requestedDueDate son requeridos'
        });
    }

    const checkAssignmentSql = `
        SELECT a.id, a.teacher_id
        FROM assignments a
        WHERE a.id = ?
    `;

    db.get(checkAssignmentSql, [assignmentId], (assignmentErr, assignment) => {
        if (assignmentErr) return res.status(500).json({ error: assignmentErr.message });
        if (!assignment) return res.status(404).json({ error: 'Tarea no encontrada' });

        const checkPendingSql = `
            SELECT id
            FROM deadline_extension_requests
            WHERE assignment_id = ?
              AND student_id = ?
              AND status = 'pending'
            LIMIT 1
        `;

        db.get(checkPendingSql, [assignmentId, studentId], (checkErr, existing) => {
            if (checkErr) return res.status(500).json({ error: checkErr.message });

            if (existing) {
                return res.status(409).json({
                    error: 'Ya tienes una solicitud pendiente para esta tarea.'
                });
            }

            const insertSql = `
                INSERT INTO deadline_extension_requests 
                (assignment_id, student_id, teacher_id, reason, requested_due_date)
                VALUES (?, ?, ?, ?, ?)
            `;

            db.run(
                insertSql,
                [assignmentId, studentId, assignment.teacher_id, reason, requestedDueDate],
                function(err) {
                    if (err) return res.status(500).json({ error: err.message });

                    res.json({
                        success: true,
                        id: this.lastID,
                        message: 'Solicitud enviada al profesor.'
                    });
                }
            );
        });
    });
});

// Ver solicitudes de extensión
app.get('/api/extension-requests', (req, res) => {
    const userId = req.query.userId;

    if (!userId) return res.status(400).json({ error: 'userId es requerido' });

    const sqlUser = `
        SELECT role
        FROM users
        WHERE id = ?
    `;

    db.get(sqlUser, [userId], (userErr, user) => {
        if (userErr) return res.status(500).json({ error: userErr.message });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const filter = user.role === 'teacher'
            ? 'der.teacher_id = ?'
            : 'der.student_id = ?';

        const sql = `
            SELECT
                der.*,
                strftime('%Y-%m-%dT%H:%M:%SZ', der.requested_due_date) as requested_due_date,
                strftime('%Y-%m-%dT%H:%M:%SZ', der.created_at) as created_at,
                a.title as assignment_title,
                strftime('%Y-%m-%dT%H:%M:%SZ', a.due_date) as current_due_date,
                s.name as subject,
                s.color_hex as subjectColor,
                stu.name as student_name,
                teach.name as teacher_name
            FROM deadline_extension_requests der
            JOIN assignments a 
                ON der.assignment_id = a.id
            JOIN subjects s 
                ON a.subject_id = s.id
            JOIN users stu 
                ON der.student_id = stu.id
            JOIN users teach 
                ON der.teacher_id = teach.id
            WHERE ${filter}
            ORDER BY der.created_at DESC
        `;

        db.all(sql, [userId], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });
});

// Aprobar o rechazar solicitud
app.put('/api/extension-requests/:id', (req, res) => {
    const requestId = req.params.id;
    const { teacherId, status, teacherResponse } = req.body;

    if (!teacherId || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
            error: 'teacherId y status válido son requeridos'
        });
    }

    const findSql = `
        SELECT *
        FROM deadline_extension_requests
        WHERE id = ?
          AND teacher_id = ?
          AND status = 'pending'
    `;

    db.get(findSql, [requestId, teacherId], (findErr, request) => {
        if (findErr) return res.status(500).json({ error: findErr.message });

        if (!request) {
            return res.status(404).json({
                error: 'Solicitud pendiente no encontrada'
            });
        }

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            const updateRequestSql = `
                UPDATE deadline_extension_requests
                SET status = ?,
                    teacher_response = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            db.run(
                updateRequestSql,
                [status, teacherResponse || '', requestId],
                (updateErr) => {
                    if (updateErr) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: updateErr.message });
                    }

                    if (status === 'approved') {
                        const updateAssignmentSql = `
                            UPDATE assignments
                            SET due_date = ?
                            WHERE id = ?
                        `;

                        db.run(
                            updateAssignmentSql,
                            [request.requested_due_date, request.assignment_id],
                            (assignmentErr) => {
                                if (assignmentErr) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: assignmentErr.message });
                                }

                                db.run('COMMIT', (commitErr) => {
                                    if (commitErr) return res.status(500).json({ error: commitErr.message });
                                    res.json({ success: true, message: 'Solicitud aprobada y fecha actualizada.' });
                                });
                            }
                        );
                    } else {
                        db.run('COMMIT', (commitErr) => {
                            if (commitErr) return res.status(500).json({ error: commitErr.message });
                            res.json({ success: true, message: 'Solicitud rechazada.' });
                        });
                    }
                }
            );
        });
    });
});

// 4. Obtener Materiales
app.get('/api/materials', (req, res) => {
    const sql = `
        SELECT 
            m.*, 
            strftime('%Y-%m-%dT%H:%M:%SZ', m.created_at) as uploadedAt,
            s.name as subject, 
            s.color_hex as subjectColor, 
            m.file_url as url, 
            u.name as teacher
        FROM materials m
        JOIN subjects s ON m.subject_id = s.id
        JOIN users u ON m.teacher_id = u.id
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Subir Material (Solo Profesores)
app.post('/api/materials', upload.single('file'), (req, res) => {
    const { title, description, subject_id, teacher_id, type } = req.body;
    const fileUrl = req.file ? `http://localhost:3001/uploads/${req.file.filename}` : req.body.url;
    const fileName = req.file ? req.file.originalname : null;
    const fileSize = req.file ? Math.round(req.file.size / 1024) : null;

    const sql = `INSERT INTO materials (title, description, subject_id, teacher_id, type, file_url, file_name, file_size_kb, is_published) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`;
    
    db.run(sql, [title, description, subject_id, teacher_id, type, fileUrl, fileName, fileSize], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

// 5. Obtener Calificaciones por asignatura
app.get('/api/grades', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId es requerido' });

    const sqlUser = `SELECT role, name FROM users WHERE id = ?`;
    db.get(sqlUser, [userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const isTeacher = user.role === 'teacher';

        const baseQuery = `
            SELECT 
                s.id AS subject_id,
                s.name AS subject,
                s.color_hex AS color,
                s.id AS id,
                et.id AS evaluation_type_id,
                et.name,
                et.type,
                et.weight,
                et.max_grade,
                e.id AS evaluation_id,
                e.grade,
                e.feedback,
                e.is_published,
                e.eval_date,
                e.student_id,
                e.graded_by,
                stu.name AS student_name,
                stu.email AS student_email,
                subj_teacher.name AS subject_teacher_name,
                teach.name AS teacher_name
            FROM subjects s
            JOIN evaluation_types et ON et.subject_id = s.id
            LEFT JOIN evaluations e ON e.evaluation_type_id = et.id
            LEFT JOIN users stu ON stu.id = e.student_id
            LEFT JOIN users teach ON teach.id = e.graded_by
            LEFT JOIN subject_enrollments se ON se.subject_id = s.id AND se.student_id = ?
            LEFT JOIN users subj_teacher ON subj_teacher.id = se.teacher_id
        `;

        const teacherFilter = `
            WHERE s.id IN (
                SELECT DISTINCT subject_id
                FROM assignments
                WHERE teacher_id = ?
            )
        `;

        const studentFilter = `
            WHERE s.id IN (
                SELECT DISTINCT subject_id
                FROM subject_enrollments
                WHERE student_id = ?
            )
            AND (e.student_id IS NULL OR e.student_id = ?)
        `;

        const query = isTeacher
            ? baseQuery + teacherFilter + ` ORDER BY s.name, et.name, stu.name`
            : baseQuery + studentFilter + ` ORDER BY s.name, et.name`;

        const params = isTeacher
            ? [userId, userId]
            : [userId, userId, userId];

        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            const grouped = rows.reduce((acc, row) => {
                const subjectKey = row.subject_id;
                if (!acc[subjectKey]) {
                    acc[subjectKey] = {
                        id: row.subject_id,
                        subject: row.subject,
                        color: row.color,
                        teacher: row.subject_teacher_name || row.teacher_name || user.name,
                        evaluations: []
                    };
                }

                const isGraded = row.grade !== null && row.grade !== undefined && row.grade !== '';

                acc[subjectKey].evaluations.push({
                    id: row.evaluation_id || row.evaluation_type_id,
                    evaluation_id: row.evaluation_id,
                    name: row.name,
                    type: row.type,
                    weight: row.weight,
                    maxGrade: row.max_grade || row.maxGrade || 10,
                    grade: row.grade,
                    feedback: row.feedback || '',
                    graded: isGraded || Boolean(row.is_published),
                    date: row.eval_date,
                    student_id: row.student_id,
                    student_name: row.student_name,
                    student_email: row.student_email,
                    graded_by: row.graded_by,
                    canEdit: isTeacher
                });

                return acc;
            }, {});

            res.json(Object.values(grouped));
        });
    });
});

app.put('/api/evaluations/:id/grade', (req, res) => {
    const evaluationId = req.params.id;
    const { grade, feedback, gradedBy } = req.body;

    if (!gradedBy) return res.status(400).json({ error: 'gradedBy es requerido' });
    if (grade === undefined || grade === null) return res.status(400).json({ error: 'grade es requerido' });

    const sql = `
        UPDATE evaluations
        SET grade = ?, feedback = ?, is_published = 1, graded_by = ?, graded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.run(sql, [grade, feedback || '', gradedBy, evaluationId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Evaluación no encontrada' });
        res.json({ success: true, id: evaluationId });
    });
});

// Actualizar estado de una tarea (entrega)
app.post('/api/tasks/:id/submit', upload.single('file'), (req, res) => {
    const { userId } = req.body;

    if (!userId || !req.file) {
        return res.status(400).json({ error: 'userId y archivo son requeridos' });
    }

    const fileName = req.file.originalname;
    const fileUrl = `http://localhost:3001/uploads/${req.file.filename}`;
    const fileSize = Math.round(req.file.size / 1024);

    console.log(`>>> Registrando entrega de estudiante ${userId} para tarea ${req.params.id}`);
    
    // Usamos INSERT OR REPLACE para que si el alumno ya entregó, se actualice la entrega existente
    const sql = `
        INSERT OR REPLACE INTO submissions 
        (assignment_id, student_id, file_name, file_url, file_size_kb, status, submitted_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
        
    db.run(sql, [req.params.id, userId, fileName, fileUrl, fileSize], function(err) {
        if (err) {
            console.error('XXX Error al insertar entrega:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('vvv Entrega registrada con éxito en la tabla submissions.');
        res.json({ 
            success: true, 
            changes: this.changes,
            submittedFile: fileName,
            submittedUrl: fileUrl,
            submittedAt: new Date().toISOString()
        });
    });
});

// Revisar entrega y guardar retroalimentación del profesor
app.post('/api/tasks/:id/review', (req, res) => {
    const assignmentId = req.params.id;
    const { teacherId, studentId, feedback, grade } = req.body;

    if (!teacherId || !studentId) {
        return res.status(400).json({ error: 'teacherId y studentId son requeridos' });
    }

    const parsedGrade = grade !== undefined && grade !== null && grade !== ''
        ? Number(grade)
        : 0;

    if (Number.isNaN(parsedGrade) || parsedGrade < 0) {
        return res.status(400).json({
            error: 'La nota debe ser un número válido mayor o igual a 0.'
        });
    }

    const findSubmissionSql = `
        SELECT sub.id
        FROM submissions sub
        JOIN assignments a
            ON sub.assignment_id = a.id
        WHERE sub.assignment_id = ?
          AND sub.student_id = ?
          AND a.teacher_id = ?
        LIMIT 1
    `;

    db.get(findSubmissionSql, [assignmentId, studentId, teacherId], (findErr, submission) => {
        if (findErr) return res.status(500).json({ error: findErr.message });

        if (!submission) {
            return res.status(404).json({
                error: 'Entrega no encontrada para revisar.'
            });
        }

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            const saveGradeSql = `
                INSERT INTO submission_grades
                    (submission_id, graded_by, grade, feedback, graded_at, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(submission_id) DO UPDATE SET
                    graded_by = excluded.graded_by,
                    grade = excluded.grade,
                    feedback = excluded.feedback,
                    graded_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
            `;

            db.run(
                saveGradeSql,
                [submission.id, teacherId, parsedGrade, feedback || ''],
                (gradeErr) => {
                    if (gradeErr) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: gradeErr.message });
                    }

                    const updateSubmissionSql = `
                        UPDATE submissions
                        SET status = 'graded',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `;

                    db.run(updateSubmissionSql, [submission.id], (updateErr) => {
                        if (updateErr) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: updateErr.message });
                        }

                        db.run('COMMIT', (commitErr) => {
                            if (commitErr) return res.status(500).json({ error: commitErr.message });

                            res.json({
                                success: true,
                                message: 'Entrega revisada correctamente.'
                            });
                        });
                    });
                }
            );
        });
    });
});

initializeDatabase()
    .then(() => ensureDeadlineExtensionTable())
    .then(() => ensureSubmissionGradesTable())
    .then(() => {
        app.listen(port, '0.0.0.0', () => console.log(`Servidor corriendo en http://localhost:${port}`));
    })
    .catch((err) => {
        console.error('No se pudo iniciar el servidor:', err.message);
        process.exit(1);
    });