
CREATE TABLE public.family_planning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid REFERENCES public.residents(id) ON DELETE CASCADE,
  method text,
  start_date date,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.family_planning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to family_planning" ON public.family_planning
  FOR ALL USING (true) WITH CHECK (true);
