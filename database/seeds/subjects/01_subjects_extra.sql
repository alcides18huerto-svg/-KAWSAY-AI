-- KAWSAY AI – Seed: Materias adicionales del currículo
-- Complemento para subjects (ejecutar después de grades/01_subjects.sql)

INSERT INTO subjects (id, name, grade) VALUES
  (gen_random_uuid()::text, 'Inglés',                    4),
  (gen_random_uuid()::text, 'Inglés',                    5),
  (gen_random_uuid()::text, 'Inglés',                    6),
  (gen_random_uuid()::text, 'Educación Física',          1),
  (gen_random_uuid()::text, 'Educación Física',          2),
  (gen_random_uuid()::text, 'Educación Física',          3),
  (gen_random_uuid()::text, 'Educación Física',          4),
  (gen_random_uuid()::text, 'Educación Física',          5),
  (gen_random_uuid()::text, 'Educación Física',          6),
  (gen_random_uuid()::text, 'Educación Religiosa',       1),
  (gen_random_uuid()::text, 'Educación Religiosa',       2),
  (gen_random_uuid()::text, 'Ciencia y Tecnología',      3),
  (gen_random_uuid()::text, 'Ciencia y Tecnología',      4),
  (gen_random_uuid()::text, 'Ciencia y Tecnología',      5),
  (gen_random_uuid()::text, 'Ciencia y Tecnología',      6)
ON CONFLICT DO NOTHING;

SELECT 'Seed subjects/curriculum adicional cargado ✓' AS resultado;
