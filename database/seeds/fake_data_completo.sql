-- ============================================================
--  KAWSAY AI – DATOS FAKE COMPLETOS PARA PRUEBAS
--  Cubre: admin, docentes, estudiantes, escuelas, aulas,
--         materias, tareas, variantes, progreso, alertas,
--         intervenciones, intentos de aprendizaje.
--
--  CREDENCIALES DE PRUEBA:
--    Admin    → admin@kawsaydemo.com       / Test1234
--    Docente1 → teacher1@kawsaydemo.com    / Test1234
--    Docente2 → teacher2@kawsaydemo.com    / Test1234
--    Student1 → student1@kawsaydemo.com    / Test1234
--    Student2 → student2@kawsaydemo.com    / Test1234
--    Student3 → student3@kawsaydemo.com    / Test1234
--    Student4 → student4@kawsaydemo.com    / Test1234
--
--  PARA ELIMINAR TODO:
--    Ejecutar: database/seeds/fake_delete_all.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. USUARIOS  (password = bcrypt de "Test1234")
-- ──────────────────────────────────────────────────────────
INSERT INTO users (id, email, password_hash, role, full_name, is_active) VALUES
  ('fk-admin-001',
   'admin@kawsaydemo.com',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMHMTA0Gt9mw9./zrBV//M2LKu',
   'ADMIN', 'Admin KAWSAY', TRUE),

  ('fk-teacher-001',
   'teacher1@kawsaydemo.com',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMHMTA0Gt9mw9./zrBV//M2LKu',
   'TEACHER', 'Prof. María Quispe', TRUE),

  ('fk-teacher-002',
   'teacher2@kawsaydemo.com',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMHMTA0Gt9mw9./zrBV//M2LKu',
   'TEACHER', 'Prof. Carlos Mamani', TRUE),

  ('fk-student-001',
   'student1@kawsaydemo.com',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMHMTA0Gt9mw9./zrBV//M2LKu',
   'STUDENT', 'Lucía Flores Huanca', TRUE),

  ('fk-student-002',
   'student2@kawsaydemo.com',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMHMTA0Gt9mw9./zrBV//M2LKu',
   'STUDENT', 'Inti Condori Apaza', TRUE),

  ('fk-student-003',
   'student3@kawsaydemo.com',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMHMTA0Gt9mw9./zrBV//M2LKu',
   'STUDENT', 'Rosa Chávez Sullca', TRUE),

  ('fk-student-004',
   'student4@kawsaydemo.com',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMHMTA0Gt9mw9./zrBV//M2LKu',
   'STUDENT', 'Juan Ticona Marca', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 2. ESCUELAS
-- ──────────────────────────────────────────────────────────
INSERT INTO schools (id, name, country, region, community) VALUES
  ('fk-school-001', 'IE 38624 Señor de Exaltación', 'Perú', 'Ayacucho',  'Quinua'),
  ('fk-school-002', 'IE Bilingüe 56222 Pisac',       'Perú', 'Cusco',    'Pisac')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 3. AULAS
-- ──────────────────────────────────────────────────────────
INSERT INTO classrooms (id, school_id, teacher_id, name, school_year) VALUES
  ('fk-class-001', 'fk-school-001', 'fk-teacher-001', '3° Grado A',   2026),
  ('fk-class-002', 'fk-school-001', 'fk-teacher-001', '4° Grado B',   2026),
  ('fk-class-003', 'fk-school-002', 'fk-teacher-002', '2° Grado Único',2026)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 4. PERFILES DE ESTUDIANTES
-- ──────────────────────────────────────────────────────────
INSERT INTO student_profiles (user_id, school_id, grade, native_language, preferred_language, interests) VALUES
  ('fk-student-001','fk-school-001', 3, 'Quechua',  'Español', 'Animales, naturaleza, dibujo'),
  ('fk-student-002','fk-school-001', 3, 'Quechua',  'Quechua', 'Música, danzas andinas'),
  ('fk-student-003','fk-school-001', 4, 'Español',  'Español', 'Matemáticas, juegos de lógica'),
  ('fk-student-004','fk-school-002', 2, 'Aymara',   'Español', 'Deportes, fútbol, naturaleza')
ON CONFLICT (user_id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 5. ESTUDIANTES INSCRITOS EN AULAS
-- ──────────────────────────────────────────────────────────
INSERT INTO classroom_students (classroom_id, student_id) VALUES
  ('fk-class-001', 'fk-student-001'),
  ('fk-class-001', 'fk-student-002'),
  ('fk-class-002', 'fk-student-003'),
  ('fk-class-003', 'fk-student-004')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 6. MATERIAS DEL CURRÍCULO
-- ──────────────────────────────────────────────────────────
INSERT INTO subjects (id, name, grade) VALUES
  ('fk-sub-mat3', 'Matemática',    3),
  ('fk-sub-com3', 'Comunicación',  3),
  ('fk-sub-mat4', 'Matemática',    4),
  ('fk-sub-com4', 'Comunicación',  4),
  ('fk-sub-mat2', 'Matemática',    2),
  ('fk-sub-com2', 'Comunicación',  2)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 7. COMPETENCIAS
-- ──────────────────────────────────────────────────────────
INSERT INTO competencies (id, subject_id, name) VALUES
  ('fk-comp-001', 'fk-sub-mat3', 'Resuelve problemas de cantidad'),
  ('fk-comp-002', 'fk-sub-mat3', 'Resuelve problemas de regularidad y equivalencia'),
  ('fk-comp-003', 'fk-sub-com3', 'Lee diversos tipos de textos en su lengua materna'),
  ('fk-comp-004', 'fk-sub-com3', 'Escribe diversos tipos de textos en su lengua materna'),
  ('fk-comp-005', 'fk-sub-mat4', 'Resuelve problemas de gestión de datos e incertidumbre'),
  ('fk-comp-006', 'fk-sub-com4', 'Se comunica oralmente en su lengua materna')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 8. TAREAS (ASSIGNMENTS)
-- ──────────────────────────────────────────────────────────
INSERT INTO assignments (id, teacher_id, classroom_id, subject, title, base_content, status) VALUES

  -- Tarea publicada (estudiantes pueden verla)
  ('fk-assign-001', 'fk-teacher-001', 'fk-class-001',
   'Matemática',
   'Sumas y restas con números naturales',
   'El estudiante resolverá ejercicios de suma y resta con números del 1 al 100. Usará material concreto como semillas o piedras para representar las operaciones. Luego graficará los resultados en una recta numérica.',
   'PUBLISHED'),

  -- Tarea publicada comunicación
  ('fk-assign-002', 'fk-teacher-001', 'fk-class-001',
   'Comunicación',
   'Comprensión lectora: El zorro y el cóndor',
   'Lectura del cuento andino "El zorro y el cóndor". El estudiante responderá preguntas de comprensión literal e inferencial, identificará los personajes principales y escribirá un final alternativo para el cuento.',
   'PUBLISHED'),

  -- Tarea en borrador
  ('fk-assign-003', 'fk-teacher-001', 'fk-class-002',
   'Matemática',
   'Multiplicación con apoyo gráfico',
   'Introducción a la multiplicación usando arreglos rectangulares y grupos iguales. El estudiante dibujará arreglos y escribirá la multiplicación correspondiente.',
   'DRAFT'),

  -- Tarea en revisión
  ('fk-assign-004', 'fk-teacher-002', 'fk-class-003',
   'Comunicación',
   'Escritura de mi nombre y mi comunidad',
   'El estudiante escribirá su nombre completo, el nombre de su comunidad y una oración describiendo algo que le gusta de donde vive. Se aceptarán palabras en lengua materna.',
   'REVIEW')

ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 9. GRADOS OBJETIVO DE CADA TAREA
-- ──────────────────────────────────────────────────────────
INSERT INTO assignment_grades (assignment_id, grade) VALUES
  ('fk-assign-001', 3),
  ('fk-assign-002', 3),
  ('fk-assign-003', 4),
  ('fk-assign-004', 2)
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 10. VARIANTES GENERADAS POR IA (aprobadas = visibles al estudiante)
-- ──────────────────────────────────────────────────────────
INSERT INTO assignment_variants (id, assignment_id, grade, content, generated_by, approval_status, version) VALUES

  ('fk-var-001', 'fk-assign-001', 3,
   '🧮 ACTIVIDAD: Sumas y restas con semillas\n\nMateriales: semillas, piedritas o frijoles.\n\n1. Toma 23 semillas y agrega 15 más. ¿Cuántas tienes en total?\n2. Tienes 40 maíces. Das 17 a tu compañero. ¿Cuántos te quedan?\n3. En la chacra hay 56 papas y 28 ocas. ¿Cuántas verduras hay en total?\n4. Dibuja la recta numérica y marca el resultado del ejercicio 1.\n\n¡Recuerda: puedes usar tus piedritas para contar!',
   'AI', 'APPROVED', 1),

  ('fk-var-002', 'fk-assign-002', 3,
   '📖 LECTURA: El zorro y el cóndor\n\nErase una vez un zorro muy astuto que quería volar como el cóndor. El cóndor, noble y sabio, le ofreció llevarlo en su espalda hasta las nubes...\n\nPREGUNTAS:\n1. ¿Quiénes son los personajes del cuento?\n2. ¿Por qué el zorro quería volar?\n3. ¿Qué crees que pasó al final? Escribe tu propio final (mínimo 3 oraciones).\n4. ¿Conoces algún cuento de tu comunidad parecido a este? Cuéntalo.',
   'AI', 'APPROVED', 1),

  ('fk-var-003', 'fk-assign-004', 2,
   '✏️ ESCRITURA: Yo y mi comunidad\n\nEscribe con tu mejor letra:\n1. Mi nombre completo es: _______________\n2. Vivo en la comunidad de: _______________\n3. Lo que más me gusta de mi comunidad es: _______________\n4. Dibuja algo especial de tu comunidad y ponle un título.\n\nPuedes escribir algunas palabras en tu lengua materna si lo deseas. ¡Tu idioma es valioso!',
   'AI', 'APPROVED', 1)

ON CONFLICT (assignment_id, grade, version) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 11. INTENTOS DE APRENDIZAJE (historial del estudiante)
-- ──────────────────────────────────────────────────────────
INSERT INTO learning_attempts (id, student_id, assignment_id, question_key, answer, is_correct, hints_used, response_time_seconds) VALUES
  ('fk-att-001','fk-student-001','fk-assign-001','mat3-suma-01','38',  TRUE,  0, 12.5),
  ('fk-att-002','fk-student-001','fk-assign-001','mat3-suma-02','23',  FALSE, 1, 28.0),
  ('fk-att-003','fk-student-001','fk-assign-001','mat3-suma-03','84',  TRUE,  0, 15.2),
  ('fk-att-004','fk-student-002','fk-assign-001','mat3-suma-01','38',  TRUE,  0, 10.1),
  ('fk-att-005','fk-student-002','fk-assign-001','mat3-suma-02','23',  TRUE,  1, 22.3),
  ('fk-att-006','fk-student-003','fk-assign-002','com3-lect-01','El zorro y el cóndor', TRUE, 0, 35.0),
  ('fk-att-007','fk-student-004','fk-assign-004','com2-escr-01','Juan Ticona', TRUE, 0, 18.5)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 12. PROGRESO DE ESTUDIANTES
-- ──────────────────────────────────────────────────────────
INSERT INTO student_progress (id, student_id, subject, mastery_level, total_attempts, correct_attempts) VALUES
  ('fk-prog-001', 'fk-student-001', 'Matemática',   66.67, 3, 2),
  ('fk-prog-002', 'fk-student-001', 'Comunicación', 100.0, 1, 1),
  ('fk-prog-003', 'fk-student-002', 'Matemática',   100.0, 2, 2),
  ('fk-prog-004', 'fk-student-003', 'Comunicación', 100.0, 1, 1),
  ('fk-prog-005', 'fk-student-004', 'Comunicación', 100.0, 1, 1),
  ('fk-prog-006', 'fk-student-001', 'General',       75.0, 4, 3),
  ('fk-prog-007', 'fk-student-002', 'General',      100.0, 2, 2)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 13. ALERTAS DE APOYO (SUPPORT FLAGS)
-- ──────────────────────────────────────────────────────────
INSERT INTO support_flags (id, student_id, reason, evidence, status) VALUES
  ('fk-flag-001','fk-student-001',
   'Dificultad en operaciones de resta',
   'El estudiante respondió incorrectamente la pregunta mat3-suma-02 usando 1 pista. Tiempo de respuesta elevado (28s). Necesita refuerzo en resta con números de dos dígitos.',
   'OPEN'),
  ('fk-flag-002','fk-student-004',
   'Posible barrera lingüística',
   'El estudiante tiene como lengua materna Aymara. Sus respuestas muestran confusión en instrucciones escritas solo en español. Se recomienda adaptar materiales.',
   'OPEN')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 14. INTERVENCIONES DEL DOCENTE
-- ──────────────────────────────────────────────────────────
INSERT INTO teacher_interventions (id, teacher_id, student_id, strategy, notes) VALUES
  ('fk-inter-001','fk-teacher-001','fk-student-001',
   'Refuerzo individual con material concreto (piedritas y semillas) para practicar resta. Sesiones de 10 minutos antes del recreo, 3 veces por semana.',
   'La estudiante muestra buena disposición. Se reforzará con ejercicios lúdicos en quechua.'),

  ('fk-inter-002','fk-teacher-002','fk-student-004',
   'Proveer materiales bilingües (Aymara-Español). Sentar al estudiante cerca de un compañero que hable Aymara como mediador cultural.',
   'Coordinar con la familia para apoyar la lectura en casa.')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ──────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM users            WHERE id LIKE 'fk-%') AS usuarios,
  (SELECT COUNT(*) FROM schools          WHERE id LIKE 'fk-%') AS escuelas,
  (SELECT COUNT(*) FROM classrooms       WHERE id LIKE 'fk-%') AS aulas,
  (SELECT COUNT(*) FROM student_profiles WHERE user_id LIKE 'fk-%') AS perfiles,
  (SELECT COUNT(*) FROM assignments      WHERE id LIKE 'fk-%') AS tareas,
  (SELECT COUNT(*) FROM assignment_variants WHERE id LIKE 'fk-%') AS variantes,
  (SELECT COUNT(*) FROM learning_attempts   WHERE id LIKE 'fk-%') AS intentos,
  (SELECT COUNT(*) FROM support_flags       WHERE id LIKE 'fk-%') AS alertas,
  (SELECT COUNT(*) FROM teacher_interventions WHERE id LIKE 'fk-%') AS intervenciones;

