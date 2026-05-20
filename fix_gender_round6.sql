-- Раунд 6 — пацієнти без імені (тільки прізвище у полі)

UPDATE cc_patients
SET gender = CASE
  WHEN TRIM(SPLIT_PART(full_name, ' ', 2)) IN (
    'Ярешко','Гайдукевич','Горіла','Руденко','Лозова','Пожилова','Нестерова'
  ) THEN 'F'
  WHEN TRIM(SPLIT_PART(full_name, ' ', 2)) IN (
    'Роллер','Михайленко','Трохименко','Гемберук',
    'Шайкін','Ющенко','Павленко','Петренко','Омеляненко'
  ) THEN 'M'
  ELSE gender
END
WHERE (gender IS NULL OR gender NOT IN ('M', 'F'))
  AND TRIM(SPLIT_PART(full_name, ' ', 2)) != '';

-- (Кантур) — з дужками
UPDATE cc_patients SET gender = 'M'
WHERE TRIM(SPLIT_PART(full_name, ' ', 2)) LIKE '%Кантур%'
  AND (gender IS NULL OR gender NOT IN ('M', 'F'));

-- Результат
SELECT gender, COUNT(*) FROM cc_patients GROUP BY gender ORDER BY COUNT(*) DESC;
