-- Insérer un compte admin par défaut
-- Note: Ceci créera un utilisateur avec email admin@ambos.local et mot de passe AdminAMBOS2025
-- L'utilisateur devra être créé manuellement via l'interface Auth de Supabase ou en se connectant via l'application

-- Créer un trigger pour assigner automatiquement le rôle admin au premier utilisateur
CREATE OR REPLACE FUNCTION assign_first_user_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Si c'est le premier utilisateur (aucun autre utilisateur dans user_roles)
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Sinon, assigner le rôle user par défaut
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

-- Créer le trigger pour l'attribution automatique des rôles
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_first_user_as_admin();