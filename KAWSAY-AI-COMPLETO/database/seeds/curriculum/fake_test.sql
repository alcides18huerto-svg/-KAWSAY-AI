-- ============================================================
--  KAWSAY AI – DATO FAKE: curriculum (competencias)
--  Una competencia de prueba
--  Requiere: subjects con id 'test-grade-0001' (seeds/grades/fake_test.sql)
--  ELIMINAR: ejecutar el DELETE al final
-- ============================================================

INSERT INTO competencies (id, subject_id, name)
VALUES ('test-comp-0001', 'test-grade-0001', 'Competencia FAKE de prueba');

-- Para eliminar este dato fake:
-- DELETE FROM competencies WHERE id = 'test-comp-0001';
