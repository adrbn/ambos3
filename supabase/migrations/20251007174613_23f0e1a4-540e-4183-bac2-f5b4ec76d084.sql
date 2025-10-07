-- Remove the ability to delete layouts
DROP POLICY IF EXISTS "Anyone can delete layouts" ON public.saved_layouts;