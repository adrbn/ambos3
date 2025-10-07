-- Create a table for saved sector watches
CREATE TABLE public.sector_watches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  query TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr',
  api TEXT NOT NULL DEFAULT 'gnews',
  description TEXT,
  color TEXT DEFAULT '#0ea5e9',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sector_watches ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read watches (public dashboard)
CREATE POLICY "Anyone can view sector watches" 
ON public.sector_watches 
FOR SELECT 
USING (true);

-- Create policy to allow anyone to create watches (for now, can be restricted later)
CREATE POLICY "Anyone can create sector watches" 
ON public.sector_watches 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow anyone to update watches
CREATE POLICY "Anyone can update sector watches" 
ON public.sector_watches 
FOR UPDATE 
USING (true);

-- Create policy to allow anyone to delete watches
CREATE POLICY "Anyone can delete sector watches" 
ON public.sector_watches 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_sector_watches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sector_watches_timestamp
BEFORE UPDATE ON public.sector_watches
FOR EACH ROW
EXECUTE FUNCTION public.update_sector_watches_updated_at();

-- Insert some default sector watches for embassy use
INSERT INTO public.sector_watches (name, sector, query, language, api, description, color) VALUES
('Défense France-Italie', 'Défense', 'défense France Italie OR militaire France Italie OR armée France Italie', 'fr', 'gnews', 'Veille sur la coopération militaire et de défense entre la France et l''Italie', '#ef4444'),
('Économie bilatérale', 'Économie', 'économie France Italie OR commerce France Italie OR investissement France Italie', 'fr', 'gnews', 'Relations économiques et commerciales franco-italiennes', '#10b981'),
('Culture et Éducation', 'Culture', 'culture France Italie OR éducation France Italie OR université France Italie', 'fr', 'gnews', 'Coopération culturelle et éducative', '#8b5cf6'),
('Migration et Sécurité', 'Sécurité', 'migration France Italie OR sécurité France Italie OR frontière France Italie', 'fr', 'gnews', 'Questions migratoires et de sécurité transfrontalière', '#f59e0b'),
('Diplomatie bilatérale', 'Diplomatie', 'diplomatie France Italie OR Macron Meloni OR relations France Italie', 'fr', 'gnews', 'Relations diplomatiques et rencontres bilatérales', '#06b6d4');