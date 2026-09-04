CREATE TABLE public.demo_access_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.demo_access_log TO service_role;

ALTER TABLE public.demo_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.demo_access_log FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX demo_access_log_ip_created_idx ON public.demo_access_log (ip_hash, created_at DESC);