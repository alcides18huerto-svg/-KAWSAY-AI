-- =============================================================
--  KAWSAY AI – Script de creación de base de datos PostgreSQL
--  Generado desde: backend/app/models.py
--  Base de datos: kawsay   Usuario: kawsay   Puerto: 5432
--  Cómo ejecutar:
--    psql -U kawsay -d kawsay -f database/scripts/create_tables.sql
-- =============================================================

-- -----------------------------------------------------------
-- 0. EXTENSIONES
-- -----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------
-- 1. TABLA: users
--    Todos los usuarios del sistema (admin, teacher, student)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL,            -- admin | teacher | student
    full_name     VARCHAR(180) NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- -----------------------------------------------------------
-- 2. TABLA: schools
--    Instituciones educativas registradas
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS schools (
    id        VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name      VARCHAR(200) NOT NULL,
    country   VARCHAR(80)  NOT NULL DEFAULT 'Perú',
    region    VARCHAR(100),
    community VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);

-- -----------------------------------------------------------
-- 3. TABLA: classrooms
--    Aulas asociadas a una escuela y un docente
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS classrooms (
    id          VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id   VARCHAR(36)  NOT NULL REFERENCES schools(id)  ON DELETE CASCADE,
    teacher_id  VARCHAR(36)  NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
    name        VARCHAR(120) NOT NULL,
    school_year INTEGER      NOT NULL DEFAULT 2026
);

CREATE INDEX IF NOT EXISTS idx_classrooms_school_id  ON classrooms(school_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher_id ON classrooms(teacher_id);

-- -----------------------------------------------------------
-- 4. TABLA: student_profiles
--    Perfil extendido para usuarios con rol 'student'
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_profiles (
    user_id            VARCHAR(36) PRIMARY KEY REFERENCES users(id)   ON DELETE CASCADE,
    school_id          VARCHAR(36)             REFERENCES schools(id)  ON DELETE SET NULL,
    grade              INTEGER     NOT NULL,
    native_language    VARCHAR(80) NOT NULL DEFAULT 'Español',
    preferred_language VARCHAR(80) NOT NULL DEFAULT 'Español',
    interests          TEXT
);

-- -----------------------------------------------------------
-- 5. TABLA: classroom_students
--    Relación muchos-a-muchos entre aulas y estudiantes
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS classroom_students (
    classroom_id VARCHAR(36) NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id   VARCHAR(36) NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    PRIMARY KEY (classroom_id, student_id)
);

-- -----------------------------------------------------------
-- 6. TABLA: subjects
--    Materias del currículo por grado escolar
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
    id    VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name  VARCHAR(120) NOT NULL,
    grade INTEGER      NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subjects_name  ON subjects(name);
CREATE INDEX IF NOT EXISTS idx_subjects_grade ON subjects(grade);

-- -----------------------------------------------------------
-- 7. TABLA: competencies
--    Competencias curriculares dentro de una materia
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS competencies (
    id         VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    subject_id VARCHAR(36)  NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_competencies_subject_id ON competencies(subject_id);

-- -----------------------------------------------------------
-- 8. TABLA: assignments
--    Tareas/actividades creadas por docentes
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
    id           VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    teacher_id   VARCHAR(36)  NOT NULL REFERENCES users(id)      ON DELETE RESTRICT,
    classroom_id VARCHAR(36)  NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    subject      VARCHAR(120) NOT NULL,
    title        VARCHAR(180) NOT NULL,
    base_content TEXT         NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'DRAFT', -- DRAFT | PUBLISHED | ARCHIVED
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id   ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_classroom_id ON assignments(classroom_id);

-- -----------------------------------------------------------
-- 9. TABLA: assignment_grades
--    Grados escolares a los que va dirigida cada tarea
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignment_grades (
    assignment_id VARCHAR(36) NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    grade         INTEGER     NOT NULL,
    PRIMARY KEY (assignment_id, grade)
);

-- -----------------------------------------------------------
-- 10. TABLA: assignment_variants
--     Variantes adaptadas por IA de una tarea para cada grado
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignment_variants (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    assignment_id   VARCHAR(36) NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    grade           INTEGER     NOT NULL,
    content         TEXT        NOT NULL,
    generated_by    VARCHAR(20) NOT NULL DEFAULT 'AI',      -- AI | MANUAL
    approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
    version         INTEGER     NOT NULL DEFAULT 1,
    CONSTRAINT uq_variant_assignment_grade_version
        UNIQUE (assignment_id, grade, version)
);

CREATE INDEX IF NOT EXISTS idx_assignment_variants_assignment_id ON assignment_variants(assignment_id);

-- -----------------------------------------------------------
-- 11. TABLA: learning_attempts
--     Intentos de aprendizaje registrados por cada estudiante
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_attempts (
    id                    VARCHAR(36)  PRIMARY KEY,
    student_id            VARCHAR(36)  NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    assignment_id         VARCHAR(36)           REFERENCES assignments(id) ON DELETE SET NULL,
    question_key          VARCHAR(100) NOT NULL,
    answer                TEXT         NOT NULL,
    is_correct            BOOLEAN      NOT NULL,
    hints_used            INTEGER      NOT NULL DEFAULT 0,
    response_time_seconds FLOAT        NOT NULL DEFAULT 0,
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_attempts_student_id    ON learning_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_attempts_assignment_id ON learning_attempts(assignment_id);

-- -----------------------------------------------------------
-- 12. TABLA: student_progress
--     Progreso agregado de dominio por materia por estudiante
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_progress (
    id               VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    student_id       VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject          VARCHAR(120) NOT NULL,
    mastery_level    FLOAT        NOT NULL DEFAULT 0,
    total_attempts   INTEGER      NOT NULL DEFAULT 0,
    correct_attempts INTEGER      NOT NULL DEFAULT 0,
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_subject    ON student_progress(subject);

-- -----------------------------------------------------------
-- 13. TABLA: support_flags
--     Alertas de necesidad de apoyo generadas por la IA
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_flags (
    id         VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    student_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason     TEXT        NOT NULL,
    evidence   TEXT        NOT NULL,
    status     VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN | IN_PROGRESS | RESOLVED
    created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_flags_student_id ON support_flags(student_id);

-- -----------------------------------------------------------
-- 14. TABLA: teacher_interventions
--     Intervenciones pedagógicas registradas por el docente
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_interventions (
    id         VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    teacher_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    student_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    strategy   TEXT        NOT NULL,
    notes      TEXT,
    created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_interventions_teacher_id ON teacher_interventions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_interventions_student_id ON teacher_interventions(student_id);

-- -----------------------------------------------------------
-- VERIFICACIÓN FINAL
-- -----------------------------------------------------------
SELECT 'KAWSAY AI – Todas las tablas creadas correctamente ✓' AS resultado;
