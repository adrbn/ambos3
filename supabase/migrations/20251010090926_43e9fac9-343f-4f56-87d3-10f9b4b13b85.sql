-- SECURITY FIXES: saved_layouts ownership + sector_watches admin-only mutations

-- 1) saved_layouts: add user ownership
ALTER TABLE public.saved_layouts
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Optional: link to auth.users (safe in this project)
ALTER TABLE public.saved_layouts
  DROP CONSTRAINT IF EXISTS saved_layouts_user_id_fkey;
ALTER TABLE public.saved_layouts
  ADD CONSTRAINT saved_layouts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Unique per user layout name for upsert
CREATE UNIQUE INDEX IF NOT EXISTS saved_layouts_user_name_uidx
  ON public.saved_layouts (user_id, name);

-- Enable RLS (if not already)
ALTER TABLE public.saved_layouts ENABLE ROW LEVEL SECURITY;

-- Drop overly-permissive old policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saved_layouts' AND policyname = 'Admins can delete layouts') THEN
    DROP POLICY "Admins can delete layouts" ON public.saved_layouts;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saved_layouts' AND policyname LIKE 'Authenticated users can%') THEN
    DROP POLICY "Authenticated users can create layouts" ON public.saved_layouts;
    DROP POLICY "Authenticated users can update their layouts or admins can upda" ON public.saved_layouts;
    DROP POLICY "Authenticated users can view layouts" ON public.saved_layouts;
  END IF;
END $$;

-- New strict policies
CREATE POLICY "Admins can view all layouts"
ON public.saved_layouts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own layouts"
ON public.saved_layouts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own layouts"
ON public.saved_layouts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own layouts"
ON public.saved_layouts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage any layouts"
ON public.saved_layouts
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (true);

CREATE POLICY "Admins can delete any layouts"
ON public.saved_layouts
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 2) sector_watches: admin-only mutations
ALTER TABLE public.sector_watches ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sector_watches' AND policyname = 'Anyone can create sector watches') THEN
    DROP POLICY "Anyone can create sector watches" ON public.sector_watches;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sector_watches' AND policyname = 'Anyone can update sector watches') THEN
    DROP POLICY "Anyone can update sector watches" ON public.sector_watches;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sector_watches' AND policyname = 'Anyone can delete sector watches') THEN
    DROP POLICY "Anyone can delete sector watches" ON public.sector_watches;
  END IF;
  -- Keep select policy if it exists; otherwise create a safe one
END $$;

-- Allow reading for everyone (if you want to lock down, change to authenticated only)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sector_watches' AND policyname = 'Anyone can view sector watches') THEN
    CREATE POLICY "Anyone can view sector watches"
    ON public.sector_watches
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Admin-only mutations
CREATE POLICY "Only admins can insert sector watches"
ON public.sector_watches
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update sector watches"
ON public.sector_watches
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete sector watches"
ON public.sector_watches
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
