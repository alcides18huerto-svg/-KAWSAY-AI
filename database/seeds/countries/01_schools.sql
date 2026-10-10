-- KAWSAY AI – Seed: Países de referencia
-- Para el campo schools.country

-- Esta tabla no existe en el modelo actual.
-- Este seed inserta escuelas de ejemplo con distintos países.

INSERT INTO schools (id, name, country, region, community) VALUES
  (gen_random_uuid()::text, 'IE 38624 - Ayacucho',        'Perú',     'Ayacucho',    'Quinua'),
  (gen_random_uuid()::text, 'IE 56222 - Cusco',            'Perú',     'Cusco',       'Pisac'),
  (gen_random_uuid()::text, 'IE Bilingüe - Puno',          'Perú',     'Puno',        'Ilave'),
  (gen_random_uuid()::text, 'Escuela Intercultural - La Paz','Bolivia', 'La Paz',     'Tiwanaku'),
  (gen_random_uuid()::text, 'Escuela Andina - Potosí',     'Bolivia',  'Potosí',      'Uyuni')
ON CONFLICT DO NOTHING;

SELECT 'Seed countries/schools cargado ✓' AS resultado;
