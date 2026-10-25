-- ============================================================
-- SQL basics, practised on the users table (SaiKet Task 5)
-- Run them with: psql "$DATABASE_URL" -f sql/practice-queries.sql
-- (or paste them one by one in pgAdmin / DBeaver / psql)
-- ============================================================

-- 1. SELECT: read every column of every row
SELECT * FROM users;

-- 2. Choose columns, filter with WHERE, sort with ORDER BY
SELECT name, email, age
FROM users
WHERE age >= 25
ORDER BY age DESC;

-- 3. Pattern search (ILIKE = case-insensitive LIKE)
SELECT name, email FROM users WHERE name ILIKE '%ben%';

-- 4. Pagination: 3 users per page, page 2
SELECT name FROM users ORDER BY name LIMIT 3 OFFSET 3;

-- 5. INSERT a row and get it back (RETURNING)
INSERT INTO users (name, email, age)
VALUES ('Practice User', 'practice.user@example.com', 30)
RETURNING id, name, created_at;

-- 6. UPDATE a row (the trigger refreshes updated_at automatically)
UPDATE users SET age = 31
WHERE email = 'practice.user@example.com'
RETURNING name, age, updated_at;

-- 7. DELETE a row
DELETE FROM users WHERE email = 'practice.user@example.com' RETURNING name;

-- 8. Aggregates: how many users, average / youngest / oldest age
SELECT COUNT(*) AS total,
       ROUND(AVG(age), 1) AS average_age,
       MIN(age) AS youngest,
       MAX(age) AS oldest
FROM users;

-- 9. GROUP BY: users per age bracket
SELECT CASE
         WHEN age < 18 THEN 'under 18'
         WHEN age < 25 THEN '18-24'
         WHEN age < 35 THEN '25-34'
         WHEN age < 50 THEN '35-49'
         ELSE '50+'
       END AS bracket,
       COUNT(*) AS users
FROM users
GROUP BY bracket
ORDER BY MIN(age);

-- 10. GROUP BY + HAVING: email domains used by more than one user
SELECT split_part(email, '@', 2) AS domain, COUNT(*) AS users
FROM users
GROUP BY domain
HAVING COUNT(*) > 1
ORDER BY users DESC;

-- 11. The constraints protect the data: each of these fails on purpose
-- INSERT INTO users (name, email, age) VALUES ('Too Old', 'old@example.com', 200);           -- CHECK age
-- INSERT INTO users (name, email, age) VALUES ('Copy', 'amira.bensalah@example.tn', 30);     -- UNIQUE email
-- INSERT INTO users (name, email, age) VALUES ('Upper Case', 'UPPER@Example.com', 30);       -- CHECK lowercase email
