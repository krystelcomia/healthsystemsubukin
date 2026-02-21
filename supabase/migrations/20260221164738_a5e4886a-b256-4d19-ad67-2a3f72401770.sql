
-- Residents table
CREATE TABLE public.residents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'Male',
  age INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Single',
  religion TEXT DEFAULT '',
  blood_type TEXT DEFAULT '',
  nationality TEXT NOT NULL DEFAULT 'Filipino',
  sitio TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Consultations table
CREATE TABLE public.consultations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  birthdate DATE,
  age INTEGER,
  sitio TEXT,
  consultation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  temperature TEXT,
  pulse_rate TEXT,
  respiration_rate TEXT,
  height TEXT,
  weight TEXT,
  consultation_cause TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Family Data table
CREATE TABLE public.family_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  family_number TEXT,
  num_households INTEGER DEFAULT 0,
  father_name TEXT,
  mother_name TEXT,
  num_males INTEGER DEFAULT 0,
  num_females INTEGER DEFAULT 0,
  total_members INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- PhilPen Health table
CREATE TABLE public.philpen_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  address_sitio TEXT,
  age INTEGER,
  birthdate DATE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bp TEXT,
  height TEXT,
  weight TEXT,
  bmi TEXT,
  smokes BOOLEAN DEFAULT false,
  drinks_alcohol BOOLEAN DEFAULT false,
  high_blood_pressure BOOLEAN DEFAULT false,
  diabetes_symptoms BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dengue Prevention table
CREATE TABLE public.dengue_prevention (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  household_name TEXT,
  container_type TEXT,
  has_larvae BOOLEAN DEFAULT false,
  action_plan TEXT,
  signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.philpen_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dengue_prevention ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth required for BHW system for now)
CREATE POLICY "Allow all access to residents" ON public.residents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to consultations" ON public.consultations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to family_data" ON public.family_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to philpen_health" ON public.philpen_health FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to dengue_prevention" ON public.dengue_prevention FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_residents_updated_at
BEFORE UPDATE ON public.residents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
