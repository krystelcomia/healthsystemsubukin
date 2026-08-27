-- ============================================================
-- Migration: Update accounts, roles, and midwife view-only setup
-- Date: 2026-08-27
-- Admin: Cristeta R. Lanuza (role: supervisor -> admin panel)
-- Midwife: Mary Jane Landicho (role: midwife -> user dashboard, view-only)
-- BNS: Maribel M. Abayon (role: bns)
-- BHW (x10): all others
-- ============================================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'midwife';

-- ============================================================
-- Upsert all BHW/BNS staff into bhw_workers
-- (Mary Jane Landicho/Midwife is NOT added to bhw_workers)
-- ============================================================

INSERT INTO public.bhw_workers (name, gmail, age, address, number, assigned_sitio, is_online, last_seen)
VALUES ('Cristeta R. Lanuza', 'cristetalanuzaADMIN@gmail.com', 0, 'Barangay Subukin', '', 'Masigla', false, NULL)
ON CONFLICT (gmail) DO UPDATE SET name = EXCLUDED.name, assigned_sitio = EXCLUDED.assigned_sitio;

INSERT INTO public.bhw_workers (name, gmail, age, address, number, assigned_sitio, is_online, last_seen)
VALUES ('Evelyn T. Ilao', 'evelynilaoBHW@gmail.com', 0, 'Barangay Subukin', '', 'Manggahan 1', false, NULL)
ON CONFLICT (gmail) DO UPDATE SET name = EXCLUDED.name, assigned_sitio = EXCLUDED.assigned_sitio;

INSERT INTO public.bhw_workers (name, gmail, age, address, number, assigned_sitio, is_online, last_seen)
VALUES ('Cecilia G. Benosa', 'ceciliabenosaBHW@gmail.com', 0, 'Barangay Subukin', '', 'Maligaya', false, NULL)
ON CONFLICT (gmail) DO UPDATE SET name = EXCLUDED.name, assigned_sitio = EXCLUDED.assigned_sitio;

INSERT INTO public.bhw_workers (name, gmail, age, address, number, assigned_sitio, is_online, last_seen)
VALUES ('Merlita R. Alonzo', 'merlitaalonzoBHW@gmail.com', 0, 'Barangay Subukin', '', 'Matahimik/Punta', false, NULL)
ON CONFLICT (gmail) DO UPDATE SET name = EXCLUDED.name, assigned_sitio = EXCLUDED.assigned_sitio;

INSERT INTO public.bhw_workers (name, gmail, age, address, number, assigned_sitio, is_online, last_seen)
VALUES ('Suzette B. Lopez', 'suzettelopezBHW@gmail.com', 0, 'Barangay Subukin', '', 'Makalintal 1', false, NULL)
ON CONFLICT (gmail) DO UPDATE SET name = EXCLUDED.name, assigned_sitio = EXCLUDED.assigned_sitio;

INSERT INTO public.bhw_workers (name, gmail, age, address, number, assigned_sitio, is_online, last_seen)
VALUES ('Amelita R. Sayat', 'amelitasayatBHW@gmail.com', 0, 'Barangay Subukin', '', 'Puntor', false, NULL)
ON CONFLICT (gmail) DO UPDATE SET name = EXCLUDED.name, assigned_sitio = EXCLUDED.assigned_sitio;

INSERT INTO public.bhw_workers (name, gmail, age, address, number, assigned_sitio, is_online, last_seen)
VALUES ('Wilma D. Tanyag', 'wilmatanyagBHW@gmail.com', 0, 'Barangay Subukin', '', 'Masaya', false, NULL)
ON CONFLICT (gmail) DO UPDATE SET name = EXCLUDED.name, assigned_sitio = EXCLUDED.assigned_sitio;

INSERT INTO public.bhw_workers (name, gmail, age, address, number, assigned_sitio, is_online, last_seen)
VALUES ('Nenita M. Dimaculangan', 'nenitadimaculanganBHW@gmail.com', 0, 'Barangay Subukin', '', 'Manggahan 2', false, NULL)
ON CONFLICT (gmail) DO UPDATE SET name = EXCLUDED.name, assigned_sitio = EXCLUDED.assigned_sitio;

INSERT INTO public.bhw_workers (name, gmail, age, address, number, assigned_sitio, is_online, last_seen)
VALUES ('Mercy O. Abanilla', 'mercyabanillaBHW@gmail.com', 0, 'Barangay Subukin', '', 'Cama', false, NULL)
ON CONFLICT (gmail) DO UPDATE SET name = EXCLUDED.name, assigned_sitio = EXCLUDED.assigned_sitio;

INSERT INTO public.bhw_workers (name, gmail, age, address, number, assigned_sitio, is_online, last_seen)
VALUES ('Renchie V. Ilao', 'renchieilaoBHW@gmail.com', 0, 'Barangay Subukin', '', 'Makalintal 2', false, NULL)
ON CONFLICT (gmail) DO UPDATE SET name = EXCLUDED.name, assigned_sitio = EXCLUDED.assigned_sitio;

INSERT INTO public.bhw_workers (name, gmail, age, address, number, assigned_sitio, is_online, last_seen)
VALUES ('Renalyn D. Laurante', 'renalynlauranteBHW@gmail.com', 0, 'Barangay Subukin', '', 'Matahimik / Burol', false, NULL)
ON CONFLICT (gmail) DO UPDATE SET name = EXCLUDED.name, assigned_sitio = EXCLUDED.assigned_sitio;

INSERT INTO public.bhw_workers (name, gmail, age, address, number, assigned_sitio, is_online, last_seen)
VALUES ('Maribel M. Abayon', 'maribelabayonBNS@gmail.com', 0, 'Barangay Subukin', '', 'Masigla', false, NULL)
ON CONFLICT (gmail) DO UPDATE SET name = EXCLUDED.name, assigned_sitio = EXCLUDED.assigned_sitio;

-- ============================================================
-- assign_role_by_email()
-- After creating all 13 auth accounts in Supabase Dashboard, run:
--   SELECT assign_role_by_email();
-- Account passwords are managed separately in Supabase Auth.
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_role_by_email()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_role public.app_role;
BEGIN
  FOR v_user IN
    SELECT au.id, au.email FROM auth.users au
    WHERE au.email IN (
      'cristetalanuzaADMIN@gmail.com',
      'evelynilaoBHW@gmail.com',
      'ceciliabenosaBHW@gmail.com',
      'merlitaalonzoBHW@gmail.com',
      'suzettelopezBHW@gmail.com',
      'amelitasayatBHW@gmail.com',
      'wilmatanyagBHW@gmail.com',
      'nenitadimaculanganBHW@gmail.com',
      'mercyabanillaBHW@gmail.com',
      'renchieilaoBHW@gmail.com',
      'renalynlauranteBHW@gmail.com',
      'maribelabayonBNS@gmail.com',
      'maryjanelandichoMIDWIFE@gmail.com'
    )
  LOOP
    -- supervisor = Cristeta R. Lanuza (BHW Supervisory -> admin panel)
    -- midwife    = Mary Jane Landicho (view-only user dashboard)
    -- bns        = Maribel M. Abayon
    -- bhw        = all remaining 10 BHW workers
    IF v_user.email = 'cristetalanuzaADMIN@gmail.com' THEN
      v_role := 'supervisor';
    ELSIF v_user.email = 'maribelabayonBNS@gmail.com' THEN
      v_role := 'bns';
    ELSIF v_user.email = 'maryjanelandichoMIDWIFE@gmail.com' THEN
      v_role := 'midwife';
    ELSE
      v_role := 'bhw';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user.id, v_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

    INSERT INTO public.profiles (user_id, username, full_name)
    VALUES (
      v_user.id,
      CASE v_user.email
        WHEN 'cristetalanuzaADMIN@gmail.com'    THEN 'Cristeta'
        WHEN 'evelynilaoBHW@gmail.com'           THEN 'Evelyn'
        WHEN 'ceciliabenosaBHW@gmail.com'        THEN 'Cecilia'
        WHEN 'merlitaalonzoBHW@gmail.com'        THEN 'Merlita'
        WHEN 'suzettelopezBHW@gmail.com'         THEN 'Suzette'
        WHEN 'amelitasayatBHW@gmail.com'         THEN 'Amelita'
        WHEN 'wilmatanyagBHW@gmail.com'          THEN 'Wilma'
        WHEN 'nenitadimaculanganBHW@gmail.com'   THEN 'Nenita'
        WHEN 'mercyabanillaBHW@gmail.com'        THEN 'Mercy'
        WHEN 'renchieilaoBHW@gmail.com'          THEN 'Renchie'
        WHEN 'renalynlauranteBHW@gmail.com'      THEN 'Renalyn'
        WHEN 'maribelabayonBNS@gmail.com'        THEN 'Maribel'
        WHEN 'maryjanelandichoMIDWIFE@gmail.com' THEN 'Mary Jane'
        ELSE split_part(v_user.email, '@', 1)
      END,
      CASE v_user.email
        WHEN 'cristetalanuzaADMIN@gmail.com'    THEN 'Cristeta R. Lanuza'
        WHEN 'evelynilaoBHW@gmail.com'           THEN 'Evelyn T. Ilao'
        WHEN 'ceciliabenosaBHW@gmail.com'        THEN 'Cecilia G. Benosa'
        WHEN 'merlitaalonzoBHW@gmail.com'        THEN 'Merlita R. Alonzo'
        WHEN 'suzettelopezBHW@gmail.com'         THEN 'Suzette B. Lopez'
        WHEN 'amelitasayatBHW@gmail.com'         THEN 'Amelita R. Sayat'
        WHEN 'wilmatanyagBHW@gmail.com'          THEN 'Wilma D. Tanyag'
        WHEN 'nenitadimaculanganBHW@gmail.com'   THEN 'Nenita M. Dimaculangan'
        WHEN 'mercyabanillaBHW@gmail.com'        THEN 'Mercy O. Abanilla'
        WHEN 'renchieilaoBHW@gmail.com'          THEN 'Renchie V. Ilao'
        WHEN 'renalynlauranteBHW@gmail.com'      THEN 'Renalyn D. Laurante'
        WHEN 'maribelabayonBNS@gmail.com'        THEN 'Maribel M. Abayon'
        WHEN 'maryjanelandichoMIDWIFE@gmail.com' THEN 'Mary Jane Landicho'
        ELSE split_part(v_user.email, '@', 1)
      END
    )
    ON CONFLICT (user_id) DO UPDATE SET
      username  = EXCLUDED.username,
      full_name = EXCLUDED.full_name;

    -- Link user_id to bhw_workers by gmail
    -- Midwife (Mary Jane) is NOT in bhw_workers
    IF v_user.email != 'maryjanelandichoMIDWIFE@gmail.com' THEN
      UPDATE public.bhw_workers
      SET user_id = v_user.id
      WHERE gmail = v_user.email
        AND (user_id IS NULL OR user_id != v_user.id);
    END IF;

  END LOOP;
END;
$$;
