-- Add enabled_languages to sector_watches for multi-language control
ALTER TABLE public.sector_watches
ADD COLUMN IF NOT EXISTS enabled_languages text[] DEFAULT ARRAY['fr','en','it'];