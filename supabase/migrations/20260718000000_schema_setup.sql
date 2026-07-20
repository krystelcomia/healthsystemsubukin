-- 1. Create role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('bhw', 'supervisor', 'supervisory', 'bns');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisory';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'bns';

-- 2. Trigger for updated_at column helper function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. Create Residents table
CREATE TABLE IF NOT EXISTS public.residents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'Male',
  age INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Single',
  religion TEXT DEFAULT '',
  blood_type TEXT DEFAULT '',
  nationality TEXT NOT NULL DEFAULT 'Filipino',
  sitio TEXT DEFAULT '',
  birthday DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_residents_updated_at ON public.residents;
CREATE TRIGGER update_residents_updated_at
  BEFORE UPDATE ON public.residents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create Consultations table
CREATE TABLE IF NOT EXISTS public.consultations (
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

-- 5. Create Family Data table
CREATE TABLE IF NOT EXISTS public.family_data (
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

-- 6. Create PhilPen Health table
CREATE TABLE IF NOT EXISTS public.philpen_health (
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

-- 7. Create Dengue Prevention table
CREATE TABLE IF NOT EXISTS public.dengue_prevention (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  household_name TEXT,
  container_type TEXT,
  has_larvae BOOLEAN DEFAULT false,
  action_plan TEXT,
  signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Create Family Planning table
CREATE TABLE IF NOT EXISTS public.family_planning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  method TEXT,
  start_date DATE,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Create Maternal Care table (Required for dashboard stats)
CREATE TABLE IF NOT EXISTS public.maternal_care (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  checkup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Create Child Health table (Required for dashboard stats)
CREATE TABLE IF NOT EXISTS public.child_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  checkup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. Create User Roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 12. Create Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 13. Create BHW Workers table
CREATE TABLE IF NOT EXISTS public.bhw_workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL DEFAULT 0,
  address TEXT NOT NULL DEFAULT '',
  gmail TEXT NOT NULL DEFAULT '',
  number TEXT NOT NULL DEFAULT '',
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_bhw_workers_updated_at ON public.bhw_workers;
CREATE TRIGGER update_bhw_workers_updated_at
  BEFORE UPDATE ON public.bhw_workers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Create User Sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  logout_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_login ON public.user_sessions(user_id, login_at DESC);

-- 15. Create User Activity Logs table
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON public.user_activity_logs(user_id, created_at DESC);


-----------------------------------------
-- Role Check Definer Functions
-----------------------------------------

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


-----------------------------------------
-- Auto-create profile on signup trigger
-----------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, username)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-----------------------------------------
-- Enable Row Level Security (RLS)
-----------------------------------------

ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.philpen_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dengue_prevention ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maternal_care ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bhw_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;


-----------------------------------------
-- Define Row Level Security Policies
-----------------------------------------

-- Drop old/pre-existing policies first to prevent duplicate errors
DROP POLICY IF EXISTS "Allow all access to residents" ON public.residents;
DROP POLICY IF EXISTS "Allow authenticated read on residents" ON public.residents;
DROP POLICY IF EXISTS "Allow authenticated insert on residents" ON public.residents;
DROP POLICY IF EXISTS "Allow authenticated update on residents" ON public.residents;
DROP POLICY IF EXISTS "Allow authenticated delete on residents" ON public.residents;

DROP POLICY IF EXISTS "Allow all access to consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow authenticated read on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow authenticated insert on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow authenticated update on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow authenticated delete on consultations" ON public.consultations;

DROP POLICY IF EXISTS "Allow all access to family_data" ON public.family_data;
DROP POLICY IF EXISTS "Allow authenticated read on family_data" ON public.family_data;
DROP POLICY IF EXISTS "Allow authenticated insert on family_data" ON public.family_data;
DROP POLICY IF EXISTS "Allow authenticated update on family_data" ON public.family_data;
DROP POLICY IF EXISTS "Allow authenticated delete on family_data" ON public.family_data;

DROP POLICY IF EXISTS "Allow all access to philpen_health" ON public.philpen_health;
DROP POLICY IF EXISTS "Allow authenticated read on philpen_health" ON public.philpen_health;
DROP POLICY IF EXISTS "Allow authenticated insert on philpen_health" ON public.philpen_health;
DROP POLICY IF EXISTS "Allow authenticated update on philpen_health" ON public.philpen_health;
DROP POLICY IF EXISTS "Allow authenticated delete on philpen_health" ON public.philpen_health;

DROP POLICY IF EXISTS "Allow all access to dengue_prevention" ON public.dengue_prevention;
DROP POLICY IF EXISTS "Allow authenticated read on dengue_prevention" ON public.dengue_prevention;
DROP POLICY IF EXISTS "Allow authenticated insert on dengue_prevention" ON public.dengue_prevention;
DROP POLICY IF EXISTS "Allow authenticated update on dengue_prevention" ON public.dengue_prevention;
DROP POLICY IF EXISTS "Allow authenticated delete on dengue_prevention" ON public.dengue_prevention;

DROP POLICY IF EXISTS "Allow all access to family_planning" ON public.family_planning;
DROP POLICY IF EXISTS "Allow authenticated read on family_planning" ON public.family_planning;
DROP POLICY IF EXISTS "Allow authenticated insert on family_planning" ON public.family_planning;
DROP POLICY IF EXISTS "Allow authenticated update on family_planning" ON public.family_planning;
DROP POLICY IF EXISTS "Allow authenticated delete on family_planning" ON public.family_planning;

DROP POLICY IF EXISTS "Allow authenticated read on maternal_care" ON public.maternal_care;
DROP POLICY IF EXISTS "Allow authenticated insert on maternal_care" ON public.maternal_care;
DROP POLICY IF EXISTS "Allow authenticated update on maternal_care" ON public.maternal_care;
DROP POLICY IF EXISTS "Allow authenticated delete on maternal_care" ON public.maternal_care;

DROP POLICY IF EXISTS "Allow authenticated read on child_health" ON public.child_health;
DROP POLICY IF EXISTS "Allow authenticated insert on child_health" ON public.child_health;
DROP POLICY IF EXISTS "Allow authenticated update on child_health" ON public.child_health;
DROP POLICY IF EXISTS "Allow authenticated delete on child_health" ON public.child_health;

DROP POLICY IF EXISTS "Allow all access to bhw_workers" ON public.bhw_workers;
DROP POLICY IF EXISTS "Allow authenticated access to bhw_workers" ON public.bhw_workers;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Supervisors can manage roles" ON public.user_roles;

DROP POLICY IF EXISTS "Users view own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users insert own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users update own sessions" ON public.user_sessions;

DROP POLICY IF EXISTS "Users view own activity" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Users insert own activity" ON public.user_activity_logs;

-- Residents and Health Records: Accessible only to logged-in users (BHWs and Supervisors)
CREATE POLICY "Allow authenticated read on residents" ON public.residents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on residents" ON public.residents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on residents" ON public.residents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on residents" ON public.residents FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on consultations" ON public.consultations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on consultations" ON public.consultations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on consultations" ON public.consultations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on consultations" ON public.consultations FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on family_data" ON public.family_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on family_data" ON public.family_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on family_data" ON public.family_data FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on family_data" ON public.family_data FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on philpen_health" ON public.philpen_health FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on philpen_health" ON public.philpen_health FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on philpen_health" ON public.philpen_health FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on philpen_health" ON public.philpen_health FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on dengue_prevention" ON public.dengue_prevention FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on dengue_prevention" ON public.dengue_prevention FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on dengue_prevention" ON public.dengue_prevention FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on dengue_prevention" ON public.dengue_prevention FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on family_planning" ON public.family_planning FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on family_planning" ON public.family_planning FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on family_planning" ON public.family_planning FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on family_planning" ON public.family_planning FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on maternal_care" ON public.maternal_care FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on maternal_care" ON public.maternal_care FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on maternal_care" ON public.maternal_care FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on maternal_care" ON public.maternal_care FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on child_health" ON public.child_health FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on child_health" ON public.child_health FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on child_health" ON public.child_health FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on child_health" ON public.child_health FOR DELETE TO authenticated USING (true);

-- BHW Workers: Read and write access to authenticated users
CREATE POLICY "Allow authenticated access to bhw_workers" ON public.bhw_workers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- User Profiles: Users can select/insert/update their own profile. Supervisors can view and update everything.
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'supervisor')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'supervisor'));

-- User Roles: Users can read their own roles, but only supervisors can manage roles.
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Supervisors can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'supervisor')) WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

-- User Sessions: Read, write, and update own sessions
CREATE POLICY "Users view own sessions" ON public.user_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Users insert own sessions" ON public.user_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.user_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User Activity Logs: Read and insert own activity log details
CREATE POLICY "Users view own activity" ON public.user_activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Users insert own activity" ON public.user_activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);


-----------------------------------------
-- Setup Avatars Storage Bucket
-----------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
DO $$ BEGIN
  CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
