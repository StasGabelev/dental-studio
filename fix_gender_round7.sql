-- Раунд 7 — масове виправлення залишків

-- Жіночі імена через LIKE (апостроф/дефіс варіанти)
UPDATE cc_patients SET gender = 'F'
WHERE TRIM(SPLIT_PART(full_name, ' ', 2)) LIKE 'Сніжана-Соф%'
  AND (gender IS NULL OR gender NOT IN ('M', 'F'));

UPDATE cc_patients SET gender = 'F'
WHERE TRIM(SPLIT_PART(full_name, ' ', 2)) LIKE 'Марія-Єліз%'
  AND (gender IS NULL OR gender NOT IN ('M', 'F'));

UPDATE cc_patients SET gender = 'F'
WHERE TRIM(SPLIT_PART(full_name, ' ', 2)) LIKE 'Мар%ян%'
  AND (gender IS NULL OR gender NOT IN ('M', 'F'));

UPDATE cc_patients SET gender = 'F'
WHERE TRIM(SPLIT_PART(full_name, ' ', 2)) LIKE '(Безпал%'
  AND (gender IS NULL OR gender NOT IN ('M', 'F'));

-- Чоловічі через LIKE (злиті/брудні записи)
UPDATE cc_patients SET gender = 'M'
WHERE TRIM(SPLIT_PART(full_name, ' ', 2)) LIKE 'Ярослав%'
  AND (gender IS NULL OR gender NOT IN ('M', 'F'));

UPDATE cc_patients SET gender = 'M'
WHERE TRIM(SPLIT_PART(full_name, ' ', 2)) LIKE 'Петренко%'
  AND (gender IS NULL OR gender NOT IN ('M', 'F'));

UPDATE cc_patients SET gender = 'M'
WHERE TRIM(SPLIT_PART(full_name, ' ', 2)) LIKE '(Желдак%'
  AND (gender IS NULL OR gender NOT IN ('M', 'F'));

UPDATE cc_patients SET gender = 'M'
WHERE TRIM(SPLIT_PART(full_name, ' ', 2)) LIKE 'Матвієнко%'
  AND (gender IS NULL OR gender NOT IN ('M', 'F'));

-- Основний UPDATE через IN
UPDATE cc_patients
SET gender = CASE
  WHEN TRIM(SPLIT_PART(full_name, ' ', 2)) IN (
    -- Жіночі
    'Ія','Вераника','Єлізавета','Єлизавета','Єліонора','Елеонора','Елеонора',
    'Катенрина','Аделія','Євгенія','Євнія','Евгенія',
    'Кузнецова','Лізавета','Tetiana','Устінова','Янина','Ельзара',
    'Зінаїда','Зинаида','Стефанія','Елла','Тіна','Міланія','Миланія',
    'Радмила','Аіда','Аида','Грандовская','Чернявська','Самойловська',
    'Крестіна','Олексада','Емилия','Амалія','Ленура','Асія','Віктрія','Ельвіра',
    'Лозова','Пожилова','Нестерова','Устінова'
  ) THEN 'F'

  WHEN TRIM(SPLIT_PART(full_name, ' ', 2)) IN (
    -- Чоловічі
    'Ілля','Илья','Тімур','Тимур','Армен','Даніл','Данил','Даниил',
    'Мартін','Гембарук','Саід','Нерійс','Марат','Владіслав',
    'Кирило','Кирил','Ковальов','Олексакндр','Олекандр',
    'Дмитренко','Дімітрій','Архіп','Глеб','Едуард','Антоній',
    'Руслвн','Сргій','Ігорь','Демир','Аріф','Ратмір',
    'Гагік','Каміран','Миненко','Гнатюк','Глущенко',
    'Нечипоренко','Супронюк','Чередниченко','Москаленко',
    'Юзехович','Поступайло','Здор','Баран','Бойко','Панченко',
    'Смалюх','Лещенко','Криволап','Пустовит','Панек',
    'Дмитренко','Ковальов'
  ) THEN 'M'

  ELSE gender
END
WHERE (gender IS NULL OR gender NOT IN ('M', 'F'))
  AND TRIM(SPLIT_PART(full_name, ' ', 2)) != '';

-- Результат
SELECT gender, COUNT(*) FROM cc_patients GROUP BY gender ORDER BY COUNT(*) DESC;
