-- ================================================
-- Script pour devenir administrateur
-- ================================================
-- Exécutez ce script dans le SQL Editor de Supabase
-- Dashboard > SQL Editor > New query > Collez et RUN

-- Option 1: Passer TOUS les utilisateurs en admin (si vous êtes le seul)
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.users.id AND role = 'admin'
);

-- Option 2: Passer UN utilisateur spécifique en admin (par email)
-- Remplacez 'votre-email@example.com' par votre vrai email
/*
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'votre-email@example.com'
AND NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.users.id AND role = 'admin'
);
*/

-- Vérifier que ça a marché
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;

-- Vous devriez voir votre email avec role = 'admin' ✅

