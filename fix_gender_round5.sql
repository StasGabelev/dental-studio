-- Раунд 5 — фінальні залишки

-- Дар'я через LIKE (будь-який апостроф)
UPDATE cc_patients SET gender = 'F'
WHERE SPLIT_PART(full_name, ' ', 2) LIKE 'Дар%я'
  AND (gender IS NULL OR gender NOT IN ('M', 'F'));

-- Марія-Єлізавета (подвійне ім'я через дефіс)
UPDATE cc_patients SET gender = 'F'
WHERE SPLIT_PART(full_name, ' ', 2) LIKE 'Марія-Єліз%'
  AND (gender IS NULL OR gender NOT IN ('M', 'F'));

-- Мар'ям через LIKE
UPDATE cc_patients SET gender = 'F'
WHERE SPLIT_PART(full_name, ' ', 2) LIKE 'Мар%ям'
  AND (gender IS NULL OR gender NOT IN ('M', 'F'));

-- Решта через TRIM + IN
UPDATE cc_patients
SET gender = CASE
  WHEN TRIM(SPLIT_PART(full_name, ' ', 2)) IN (
    'Вераніка','Владимира','Станіслава','Вера','Ірена',
    'Лоліта','Нонна','Єлізавета','Єлизавета','Аміна',
    'анна','Марьяна','Маряна','Віталія','Виталия','Марьям'
  ) THEN 'F'
  WHEN TRIM(SPLIT_PART(full_name, ' ', 2)) IN (
    'Констянтин',   -- через Я
    'Михаіл',       -- через І (не ї)
    'Ілля','Илья',
    'Тимофей','Тимофій',
    'Дарий','Дарій',
    'Леонардо',
    'Устин','Устім',
    'Даніл','Данил',
    'Юліан','Юлиан',
    'Семён','Семен',
    'Захарій','Захарий',
    'Дан',
    'Ерат'
  ) THEN 'M'
  ELSE gender
END
WHERE (gender IS NULL OR gender NOT IN ('M', 'F'))
  AND TRIM(SPLIT_PART(full_name, ' ', 2)) != '';

-- Результат
SELECT gender, COUNT(*) FROM cc_patients GROUP BY gender ORDER BY COUNT(*) DESC;
