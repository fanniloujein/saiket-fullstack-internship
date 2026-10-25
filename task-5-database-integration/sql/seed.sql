-- Sample users (fictional). ON CONFLICT makes the script safe to run several times.
INSERT INTO users (name, email, age) VALUES
  ('Amira Ben Salah',  'amira.bensalah@example.tn',  24),
  ('Youssef Trabelsi', 'youssef.trabelsi@example.tn', 31),
  ('Salma Gharbi',     'salma.gharbi@example.tn',     19),
  ('Karim Haddad',     'karim.haddad@example.tn',     45),
  ('Ines Jaziri',      'ines.jaziri@example.tn',      28),
  ('Mehdi Ayari',      'mehdi.ayari@example.com',     36),
  ('Nour Chaabane',    'nour.chaabane@example.com',   22),
  ('Rania Mejri',      'rania.mejri@example.tn',      52)
ON CONFLICT (email) DO NOTHING;
