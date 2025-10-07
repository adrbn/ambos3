-- Create table for storing user layouts
CREATE TABLE public.saved_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  module_order JSONB NOT NULL,
  module_sizes JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(name)
);

-- Enable RLS
ALTER TABLE public.saved_layouts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read layouts (public layouts)
CREATE POLICY "Layouts are viewable by everyone"
  ON public.saved_layouts
  FOR SELECT
  USING (true);

-- Allow anyone to insert layouts
CREATE POLICY "Anyone can create layouts"
  ON public.saved_layouts
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update layouts
CREATE POLICY "Anyone can update layouts"
  ON public.saved_layouts
  FOR UPDATE
  USING (true);

-- Allow anyone to delete layouts
CREATE POLICY "Anyone can delete layouts"
  ON public.saved_layouts
  FOR DELETE
  USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_layouts_updated_at
  BEFORE UPDATE ON public.saved_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();