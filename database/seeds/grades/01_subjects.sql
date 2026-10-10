-- KAWSAY AI – Seed: Grados escolares de referencia
-- Tabla: subjects (muestra de materias por grado)

INSERT INTO subjects (id, name, grade) VALUES
  (gen_random_uuid()::text, 'Comunicación',         1),
  (gen_random_uuid()::text, 'Matemática',            1),
  (gen_random_uuid()::text, 'Personal Social',       1),
  (gen_random_uuid()::text, 'Ciencia y Tecnología',  1),
  (gen_random_uuid()::text, 'Arte y Cultura',        1),
  (gen_random_uuid()::text, 'Comunicación',         2),
  (gen_random_uuid()::text, 'Matemática',            2),
  (gen_random_uuid()::text, 'Personal Social',       2),
  (gen_random_uuid()::text, 'Ciencia y Tecnología',  2),
  (gen_random_uuid()::text, 'Comunicación',         3),
  (gen_random_uuid()::text, 'Matemática',            3),
  (gen_random_uuid()::text, 'Personal Social',       3),
  (gen_random_uuid()::text, 'Comunicación',         4),
  (gen_random_uuid()::text, 'Matemática',            4),
  (gen_random_uuid()::text, 'Comunicación',         5),
  (gen_random_uuid()::text, 'Matemática',            5),
  (gen_random_uuid()::text, 'Comunicación',         6),
  (gen_random_uuid()::text, 'Matemática',            6)
ON CONFLICT DO NOTHING;

SELECT 'Seed grades/subjects cargado ✓' AS resultado;
