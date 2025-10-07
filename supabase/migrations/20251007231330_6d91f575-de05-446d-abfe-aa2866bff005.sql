-- Add multilingual query columns
ALTER TABLE public.sector_watches 
ADD COLUMN query_en TEXT,
ADD COLUMN query_it TEXT;

-- Update existing watches with English and Italian versions
UPDATE public.sector_watches SET 
  query_en = CASE name
    WHEN 'Défense France-Italie' THEN 'defense France Italy OR military France Italy OR army France Italy'
    WHEN 'Économie bilatérale' THEN 'economy France Italy OR trade France Italy OR investment France Italy'
    WHEN 'Culture et Éducation' THEN 'culture France Italy OR education France Italy OR university France Italy'
    WHEN 'Migration et Sécurité' THEN 'migration France Italy OR security France Italy OR border France Italy'
    WHEN 'Diplomatie bilatérale' THEN 'diplomacy France Italy OR Macron Meloni OR relations France Italy'
    WHEN 'Tech & Innovation FR-IT' THEN 'technology France Italy OR innovation France Italy OR startup France Italy OR digital France Italy'
    WHEN 'Énergie & Climat' THEN 'energy France Italy OR climate France Italy OR environment France Italy OR renewable France Italy'
    WHEN 'Commerce & Agriculture' THEN 'trade France Italy OR agriculture France Italy OR export France Italy OR import France Italy'
    WHEN 'Justice & Intérieur' THEN 'justice France Italy OR police France Italy OR judicial cooperation France Italy'
    WHEN 'Transport & Infrastructure' THEN 'transport France Italy OR infrastructure France Italy OR TGV France Italy OR tunnel France Italy'
    WHEN 'Santé publique' THEN 'health France Italy OR medicine France Italy OR medical research France Italy OR hospital France Italy'
    WHEN 'Tourisme & Patrimoine' THEN 'tourism France Italy OR heritage France Italy OR museum France Italy OR culture France Italy'
    WHEN 'Sport & Événements' THEN 'sport France Italy OR competition France Italy OR Olympics France Italy OR football France Italy'
    WHEN 'Médias & Communication' THEN 'media France Italy OR press France Italy OR communication France Italy OR information France Italy'
    WHEN 'Défense européenne' THEN 'European defense OR NATO France Italy OR European security OR European army'
    ELSE query
  END,
  query_it = CASE name
    WHEN 'Défense France-Italie' THEN 'difesa Francia Italia OR militare Francia Italia OR esercito Francia Italia'
    WHEN 'Économie bilatérale' THEN 'economia Francia Italia OR commercio Francia Italia OR investimento Francia Italia'
    WHEN 'Culture et Éducation' THEN 'cultura Francia Italia OR educazione Francia Italia OR università Francia Italia'
    WHEN 'Migration et Sécurité' THEN 'migrazione Francia Italia OR sicurezza Francia Italia OR frontiera Francia Italia'
    WHEN 'Diplomatie bilatérale' THEN 'diplomazia Francia Italia OR Macron Meloni OR relazioni Francia Italia'
    WHEN 'Tech & Innovation FR-IT' THEN 'tecnologia Francia Italia OR innovazione Francia Italia OR startup Francia Italia OR digitale Francia Italia'
    WHEN 'Énergie & Climat' THEN 'energia Francia Italia OR clima Francia Italia OR ambiente Francia Italia OR rinnovabile Francia Italia'
    WHEN 'Commerce & Agriculture' THEN 'commercio Francia Italia OR agricoltura Francia Italia OR esportazione Francia Italia OR importazione Francia Italia'
    WHEN 'Justice & Intérieur' THEN 'giustizia Francia Italia OR polizia Francia Italia OR cooperazione giudiziaria Francia Italia'
    WHEN 'Transport & Infrastructure' THEN 'trasporto Francia Italia OR infrastruttura Francia Italia OR TGV Francia Italia OR tunnel Francia Italia'
    WHEN 'Santé publique' THEN 'salute Francia Italia OR medicina Francia Italia OR ricerca medica Francia Italia OR ospedale Francia Italia'
    WHEN 'Tourisme & Patrimoine' THEN 'turismo Francia Italia OR patrimonio Francia Italia OR museo Francia Italia OR cultura Francia Italia'
    WHEN 'Sport & Événements' THEN 'sport Francia Italia OR competizione Francia Italia OR Olimpiadi Francia Italia OR calcio Francia Italia'
    WHEN 'Médias & Communication' THEN 'media Francia Italia OR stampa Francia Italia OR comunicazione Francia Italia OR informazione Francia Italia'
    WHEN 'Défense européenne' THEN 'difesa europea OR NATO Francia Italia OR sicurezza europea OR esercito europeo'
    ELSE query
  END;

-- Update default API to newsapi
UPDATE public.sector_watches SET api = 'newsapi' WHERE api = 'gnews';