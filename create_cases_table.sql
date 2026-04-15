-- Table for treatment cases (portfolio)
CREATE TABLE IF NOT EXISTS public.treatment_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    title_uk TEXT NOT NULL,
    description_uk TEXT,
    main_image_url TEXT,
    before_image_url TEXT,
    after_image_url TEXT,
    doctor_name_uk TEXT,
    treatment_type_uk TEXT,
    stages JSONB DEFAULT '[]'::jsonb, -- Array of objects {title, doctor, desc, image_url}
    gallery JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
    sort_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.treatment_cases ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published cases
CREATE POLICY "Public Read Cases"
ON public.treatment_cases FOR SELECT
USING (is_published = true OR (auth.role() = 'authenticated'));

-- Policy: Admin (authenticated) can manage all cases
CREATE POLICY "Admin Manage Cases"
ON public.treatment_cases FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert a sample case based on case-1.html
INSERT INTO public.treatment_cases (
    slug, category, title_uk, description_uk, main_image_url, 
    before_image_url, after_image_url, stages, is_published
) VALUES (
    'keramichni-viniry-anna',
    'veneers',
    'КЕРАМІЧНІ ВІНІРИ',
    'Повне відновлення естетики посмішки за допомогою керамічних вінірів преміум-класу.',
    'https://storage.googleapis.com/tokar_clinic_site/patients/MelnykAnna/preview.jpg',
    'https://storage.googleapis.com/tokar_clinic_site/patients/MelnykAnna/before.jpg',
    'https://storage.googleapis.com/tokar_clinic_site/patients/MelnykAnna/after.jpg',
    '[
        {"title": "ОРТОДОНТІЯ", "doctor": "МАРІЯ ТОКАР", "desc": "Попередня підготовка зубних рядів за допомогою брекет-системи для створення правильного оклюзійного простору під майбутні вініри.", "image_url": "https://storage.googleapis.com/tokar_clinic_site/patients/MelnykAnna/ortho_process.jpg"},
        {"title": "ХІРУРГІЯ", "doctor": "АНАТОЛІЙ ТОКАР", "desc": "Хірургічне видовження клінічної коронки зуба для створення ідеального ясенного контуру та гармонійної посмішки.", "image_url": "https://storage.googleapis.com/tokar_clinic_site/patients/MelnykAnna/surgery_process.jpg"},
        {"title": "ОРТОПЕДІЯ", "doctor": "АНАТОЛІЙ ТОКАР", "desc": "Фінальний етап: встановлення 20 керамічних вінірів преміум-класу. Відновлення естетики та функціональності посмішки.", "image_url": "https://storage.googleapis.com/tokar_clinic_site/patients/MelnykAnna/preview.jpg"}
    ]'::jsonb,
    true
) ON CONFLICT (slug) DO NOTHING;
