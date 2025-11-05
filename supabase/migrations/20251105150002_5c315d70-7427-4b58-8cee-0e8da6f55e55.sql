-- Add new columns to sector_watches table for source configuration
ALTER TABLE public.sector_watches 
ADD COLUMN IF NOT EXISTS source_mode TEXT DEFAULT 'press' CHECK (source_mode IN ('press', 'osint', 'both')),
ADD COLUMN IF NOT EXISTS press_sources TEXT[] DEFAULT ARRAY['newsapi'],
ADD COLUMN IF NOT EXISTS osint_sources TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN public.sector_watches.source_mode IS 'Type of sources to use: press (news APIs), osint (social media), or both';
COMMENT ON COLUMN public.sector_watches.press_sources IS 'Array of press sources: newsapi, gnews, mediastack, military-rss, google';
COMMENT ON COLUMN public.sector_watches.osint_sources IS 'Array of OSINT sources: gopher (Twitter/X), bluesky';