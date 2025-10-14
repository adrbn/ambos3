-- Create table for module configurations (admin control)
CREATE TABLE IF NOT EXISTS public.module_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.module_config ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view module configs
CREATE POLICY "Anyone can view module configs"
ON public.module_config
FOR SELECT
USING (true);

-- Only admins can update module configs
CREATE POLICY "Only admins can update module configs"
ON public.module_config
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert module configs
CREATE POLICY "Only admins can insert module configs"
ON public.module_config
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_module_config_updated_at
  BEFORE UPDATE ON public.module_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default module configurations
INSERT INTO public.module_config (module_id, enabled) VALUES
  ('map', true),
  ('timeline', true),
  ('network-graph', true),
  ('entities', true),
  ('summary', true),
  ('predictions', true),
  ('datafeed', true),
  ('enrichment', true),
  ('osint-mastodon', true),
  ('osint-bluesky', true),
  ('osint-gopher', true),
  ('osint-military-rss', true)
ON CONFLICT (module_id) DO NOTHING;