-- ============================================================
--  KAWSAY AI – ELIMINAR TODOS LOS DATOS FAKE
--  Ejecutar este archivo para limpiar todos los datos de prueba
--  Orden: de hijos a padres (respeta las FK)
-- ============================================================

DELETE FROM teacher_interventions WHERE id        LIKE 'fk-%';
DELETE FROM support_flags          WHERE id        LIKE 'fk-%';
DELETE FROM student_progress       WHERE id        LIKE 'fk-%';
DELETE FROM learning_attempts      WHERE id        LIKE 'fk-%';
DELETE FROM assignment_variants    WHERE id        LIKE 'fk-%';
DELETE FROM assignment_grades      WHERE assignment_id LIKE 'fk-%';
DELETE FROM assignments            WHERE id        LIKE 'fk-%';
DELETE FROM competencies           WHERE id        LIKE 'fk-%';
DELETE FROM subjects               WHERE id        LIKE 'fk-%';
DELETE FROM classroom_students     WHERE classroom_id LIKE 'fk-%';
DELETE FROM classrooms             WHERE id        LIKE 'fk-%';
DELETE FROM student_profiles       WHERE user_id   LIKE 'fk-%';
DELETE FROM schools                WHERE id        LIKE 'fk-%';
DELETE FROM users                  WHERE id        LIKE 'fk-%';

SELECT 'Todos los datos fake eliminados ✓' AS resultado;
