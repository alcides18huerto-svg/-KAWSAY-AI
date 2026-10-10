-- ============================================================
--  KAWSAY AI – DATO FAKE: languages (idiomas / perfiles)
--  Un usuario estudiante de prueba con su perfil
--  ELIMINAR: ejecutar los DELETE al final (en orden)
-- ============================================================

-- 1. Usuario fake
INSERT INTO users (id, email, password_hash, role, full_name)
VALUES (
  'test-user-0001',
  'fake_student@kawsaydemo.com',
  'hashed_password_fake',
  'student',
  'Estudiante FAKE Test'
);

-- 2. Perfil del estudiante fake
INSERT INTO student_profiles (user_id, school_id, grade, native_language, preferred_language)
VALUES (
  'test-user-0001',
  'test-school-0001',   -- requiere schools/fake_test.sql
  1,
  'Quechua',
  'Español'
);

-- Para eliminar estos datos fake (en orden):
-- DELETE FROM student_profiles WHERE user_id = 'test-user-0001';
-- DELETE FROM users           WHERE id       = 'test-user-0001';

