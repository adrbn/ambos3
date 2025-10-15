# AmbOS — OSINT Command Center v2.0

Ce dépôt contient AmbOS, une interface front-end Vite + React (TypeScript) pour agréger des sources presse et OSINT (Mastodon, BlueSky, X/Twitter via Gopher, Google, flux RSS spécialisés, ...).

## Objectif
Fournir un centre de veille permettant de croiser automatiquement des résultats presse + sites spécialisés + réseaux sociaux + recherche Google, d'enregistrer des veilles (watches) et d'afficher des informations géographiques pertinentes sur une carte.

## État actuel
- Mode de stockage choisi pour les métadonnées des veilles : localStorage (persistant côté navigateur). Aucune migration DB n'a été appliquée automatiquement.
- L'API LOVABLE (utilisée côté Supabase Functions pour l'inférence de lieux) n'est pas fournie dans cet environnement. Le module carte fonctionne en priorisant les coordonnées explicites (coords, author_location, location) et utilise l'appel d'IA en secours si la clé LOVABLE est configurée côté Supabase.

## Prérequis
- Node 18+ (le projet recommande Node 22.x) et npm
- Variables d'environnement pour le front-end (fichier `.env` à la racine pour dev local):
  - VITE_SUPABASE_URL=https://your-supabase-url
  - VITE_SUPABASE_PUBLISHABLE_KEY=your-public-anon-key

(Optionnel / pour functions Supabase)
  - LOVABLE_API_KEY=your_lovable_api_key (nécessaire uniquement si vous souhaitez activer l'extraction AI côté Supabase functions)

## Installation
1. Installer les dépendances

   npm install

2. Lancer le serveur de développement

   npm run dev

L'application sera disponible sur http://localhost:8080/ (ou sur le domaine fourni par l'environnement).

## Fonctionnalités implémentées (résumé)
- Recherche "mixte" (news + OSINT) : quand `selectedApi === 'mixed'` la recherche lance en parallèle la recherche presse et les fetchs OSINT configurés et fusionne les résultats.
- Veilles (Sector Watches) :
  - Ajout d'un sélecteur "Source" (News / OSINT) dans le dialogue de création/édition de veille.
  - Sélection des plateformes OSINT (Mastodon, BlueSky, Gopher/X, Google, Military RSS) sauvegardée localement (localStorage) par veille.
  - Au lancement d'une veille, l'UI bascule automatiquement sur l'onglet recherche et applique la configuration (sourceType/osintSources) de la veille.
- Carte (MapModule) :
  - Priorise les coordonnées explicites présentes dans les articles/posts (osint.coords, author_location, location).
  - Si aucune coordonnée explicite, appelle la function Supabase `extract-locations` (qui utilise Lovable) pour inférer la position de la source. Si la clé LOVABLE est absente, le fallback local permet quand même d'afficher les données basées sur coordonnées présentes.
  - Les popups affichent un résumé lié au lieu (plutôt que la localisation mentionnée dans le contenu).
- Flux de données (DataFeedModule) :
  - Détection de la plateforme améliorée (X/Twitter, Mastodon, BlueSky, Web).
  - Tag X/Twitter corrigé là où nécessaire.
  - Calcul de fiabilité (credibilityScore) : si absent, un fallback heuristique est utilisé pour afficher une estimation.
  - Onglets/filtrage : améliorations pour "Récents" / "Tendances" (tri par score d'engagement pondéré) et ajout d'onglets par plateforme (filtrage).

## Comportement de la carte sans LOVABLE_API_KEY
- Le module carte n'est pas bloquant : il affichera d'abord toutes les localisations explicitement fournies par les articles.
- Pour les posts sans métadonnées de localisation, l'extraction AI (Lovable) est utilisée uniquement si la function Supabase peut accéder à LOVABLE_API_KEY. Sans clé, ces posts seront simplement ignorés par l'extracteur AI.

## Stockage des préférences de veille
- Les champs `sourceType` et `osintSources` sont stockés dans `localStorage` sous la clef `watch_meta_{watchId}`. Cela évite une migration DB immédiate mais ces préférences ne sont pas partagées entre utilisateurs.
- Si vous souhaitez persister ces champs côté serveur, il faudra ajouter les colonnes correspondantes à la table `sector_watches`. Exemple de migration SQL ci-dessous.

### Exemple de migration SQL (Supabase / Postgres)
ALTER TABLE public.sector_watches
ADD COLUMN source_type TEXT DEFAULT 'news',
ADD COLUMN osint_sources TEXT[] DEFAULT ARRAY['mastodon','bluesky','gopher','google','military-rss'];

(Remplacer les noms/typos suivant vos conventions.)

## Où j'ai modifié le code
- src/components/SectorWatchesModule.tsx  (sélecteur sources + sauvegarde locale)
- src/components/SearchBar.tsx           (support mixed, appels functions synchronisés)
- src/components/MapModule.tsx            (priorisation coords explicites + fallback AI)
- src/components/DataFeedModule.tsx       (détection plateforme, fiabilité fallback, onglets plateforme)
- src/pages/Index.tsx                     (lancement de veille, switch d'onglet)

## Si vous récupérez la LOVABLE_API_KEY plus tard
1. Ajoutez la clé dans les variables d'environnement côté Supabase (Functions environment) nommée `LOVABLE_API_KEY`.
2. L'endpoint `supabase/functions/extract-locations` utilisera automatiquement la clé pour enrichir les localisations.

## MCP / Intégrations recommandées
Si vous souhaitez connecter des services externes depuis l'interface Builder/MCP, voici les intégrations disponibles et utiles pour ce projet :
- Supabase (préféré pour DB, auth, fonctions) — [Connect to Supabase](#open-mcp-popover)
- Neon — [Connect to Neon](#open-mcp-popover)
- Netlify — [Connect to Netlify](#open-mcp-popover)
- Zapier — [Connect to Zapier](#open-mcp-popover)
- Figma (plugin) — utiliser le plugin Figma via le popover MCP ou directement : https://www.figma.com/community/plugin/747985167520967365/builder-io-ai-powered-figma-to-code-react-vue-tailwind-more
- Builder.io — [Connect to Builder.io](#open-mcp-popover)
- Linear — [Connect to Linear](#open-mcp-popover)
- Notion — [Connect to Notion](#open-mcp-popover)
- Sentry — [Connect to Sentry](#open-mcp-popover)
- Context7 — [Connect to Context7](#open-mcp-popover)
- Semgrep — [Connect to Semgrep](#open-mcp-popover)
- Prisma Postgres — [Connect to Prisma](#open-mcp-popover)

> Remarque : Supabase est le plus pertinent ici (stockage de veilles, functions, auth). Vous pouvez connecter ces MCPs via le popover si vous souhaitez automatiser la configuration.

## Tests manuels rapides
- Lancer `npm run dev`
- Créer une veille (Menu Veilles) et sélectionner OSINT / Mastodon / X
- Lancer la veille : l'onglet Recherche doit s'ouvrir et exécuter la recherche mixte (si API mixte) ou OSINT selon le choix
- Aller dans le module Carte : si les articles contiennent `author_location` ou `osint.coords` vous verrez des marqueurs; sinon, l'AI extraction tentera d'inférer des lieux si LOVABLE_API_KEY est configurée côté Supabase
- Vérifier le Data Feed : tags plateforme (X/Twitter) et badge de crédibilité

## Contribuer
- Respecter les conventions TypeScript/React présentes dans le projet.
- Tester localement avant commit.

---
Si tu veux, je peux :
- Générer la migration SQL (prête à exécuter) pour persister `sourceType` / `osintSources` côté DB.
- Ou laisser la configuration en localStorage (actuelle). 

README généré automatiquement — dis-moi si tu veux des modifications ou plus de détails sur une section précise.
