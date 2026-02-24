
-- Create bhw_workers table
CREATE TABLE public.bhw_workers (
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

-- Enable RLS
ALTER TABLE public.bhw_workers ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to access bhw_workers
CREATE POLICY "Allow all access to bhw_workers" ON public.bhw_workers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_bhw_workers_updated_at
  BEFORE UPDATE ON public.bhw_workers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
