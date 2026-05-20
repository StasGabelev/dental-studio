CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  discount_text TEXT,
  logo_url TEXT,
  contact TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Тестовый партнёр
INSERT INTO partners (name, description, discount_text, contact) VALUES
('Аптека "Здоров''я"', 'Аптека на просп. Незалежності', '7% знижка на всі товари', 'просп. Незалежності, 15');
