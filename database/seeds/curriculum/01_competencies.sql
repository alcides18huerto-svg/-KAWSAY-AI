-- KAWSAY AI – Seed: Currículo Nacional (competencias base)
-- Competencias de referencia para Comunicación grados 1-6
-- Requiere que existan las materias en subjects (ejecutar grades/01_subjects.sql primero)

DO $'$'
DECLARE
  v_subject_id VARCHAR(36);
BEGIN
  -- Competencias de Comunicación grado 1
  SELECT id INTO v_subject_id FROM subjects WHERE name = 'Comunicación' AND grade = 1 LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO competencies (id, subject_id, name) VALUES
      (gen_random_uuid()::text, v_subject_id, 'Se comunica oralmente en su lengua materna'),
      (gen_random_uuid()::text, v_subject_id, 'Lee diversos tipos de textos escritos en su lengua materna'),
      (gen_random_uuid()::text, v_subject_id, 'Escribe diversos tipos de textos en su lengua materna')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Competencias de Matemática grado 1
  SELECT id INTO v_subject_id FROM subjects WHERE name = 'Matemática' AND grade = 1 LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO competencies (id, subject_id, name) VALUES
      (gen_random_uuid()::text, v_subject_id, 'Resuelve problemas de cantidad'),
      (gen_random_uuid()::text, v_subject_id, 'Resuelve problemas de regularidad, equivalencia y cambio'),
      (gen_random_uuid()::text, v_subject_id, 'Resuelve problemas de forma, movimiento y localización')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$'$';

SELECT 'Seed curriculum/competencies cargado ✓' AS resultado;
