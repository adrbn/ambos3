-- Fix the search path security issue
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_saved_layouts_updated_at ON public.saved_layouts;

CREATE TRIGGER update_saved_layouts_updated_at
  BEFORE UPDATE ON public.saved_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();