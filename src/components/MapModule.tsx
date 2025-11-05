import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";

interface MapModuleProps {
  articles: any[];
  language: Language;
  sourceType: 'news' | 'osint';
}

// Fix Leaflet default marker icon - Custom cyber style
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Create custom marker icon with cyber style
const customIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 30px; height: 30px;">
      <div style="
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 12px solid transparent;
        border-right: 12px solid transparent;
        border-top: 20px solid #00D9FF;
        filter: drop-shadow(0 0 8px #00D9FF);
      "></div>
      <div style="
        position: absolute;
        top: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        border-top: 16px solid #0a0a0a;
      "></div>
    </div>
  `,
  className: 'custom-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

const MapModule = ({ articles, language, sourceType }: MapModuleProps) => {
  const { t } = useTranslation(language);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  // Initialize map once when enabled
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !isEnabled) return;

    const initMap = () => {
      if (!mapContainerRef.current || mapRef.current) return;
      
      try {
        const map = L.map(mapContainerRef.current, {
          center: [20, 0],
          zoom: 1.5,
          minZoom: 1,
          maxZoom: 19,
          scrollWheelZoom: false,
          zoomControl: true,
        });

        // Use dark mode tiles (CartoDB Dark Matter)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap © CARTO',
          maxZoom: 19,
          subdomains: 'abcd'
        }).addTo(map);

        mapRef.current = map;
        setIsMapReady(true);
        
        // Force resize multiple times to ensure proper rendering on mobile
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
        setTimeout(() => {
          map.invalidateSize();
        }, 300);
        setTimeout(() => {
          map.invalidateSize();
        }, 500);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    // Initialize after a short delay to ensure container is rendered
    const timer = setTimeout(initMap, 200);

    // Cleanup
    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setIsMapReady(false);
      }
    };
  }, [isEnabled]);

  // Extract and update markers when articles change
  useEffect(() => {
    if (!mapRef.current || !isMapReady || !isEnabled) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (articles.length === 0) return;

    // Extraire les localisations via AI
    const extractLocations = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-locations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ articles, sourceType }),
        });

        if (!response.ok) {
          console.error('Error extracting locations:', response.statusText);
          return;
        }

        const { locations } = await response.json();
        
        if (!locations || locations.length === 0) {
          console.log('No locations extracted');
          return;
        }

        // Ajouter les marqueurs pour chaque localisation
        locations.forEach((location: any, index: number) => {
          try {
            const article = articles[index] || articles[0];
            const marker = L.marker([location.lat, location.lng], { icon: customIcon })
              .bindPopup(`
                <div style="
                  font-size: 12px; 
                  max-width: 250px;
                  background: rgba(10, 10, 10, 0.95);
                  border: 1px solid rgba(0, 217, 255, 0.3);
                  border-radius: 4px;
                  padding: 12px;
                ">
                  <h3 style="
                    font-weight: bold; 
                    color: #00D9FF; 
                    margin: 0 0 8px 0;
                    text-transform: uppercase;
                    font-size: 11px;
                    letter-spacing: 0.5px;
                  ">${location.name}</h3>
                  <p style="
                    margin: 0 0 4px 0; 
                    font-style: italic; 
                    font-size: 10px;
                    color: rgba(0, 217, 255, 0.7);
                  ">${location.relevance}</p>
                  <p style="
                    margin: 0 0 8px 0;
                    color: rgba(255, 255, 255, 0.9);
                    line-height: 1.4;
                  ">${article.title}</p>
                  <a href="${article.url}" target="_blank" rel="noopener noreferrer" style="
                    color: #00D9FF; 
                    text-decoration: none;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border: 1px solid rgba(0, 217, 255, 0.3);
                    padding: 4px 8px;
                    border-radius: 2px;
                    display: inline-block;
                    transition: all 0.2s;
                  " onmouseover="this.style.borderColor='#00D9FF'; this.style.backgroundColor='rgba(0, 217, 255, 0.1)'" onmouseout="this.style.borderColor='rgba(0, 217, 255, 0.3)'; this.style.backgroundColor='transparent'">
                    ${t('readArticle')} →
                  </a>
                </div>
              `)
              .addTo(mapRef.current!);
            
            markersRef.current.push(marker);
          } catch (error) {
            console.error('Error adding marker:', error);
          }
        });

        console.log(`Added ${locations.length} location markers`);

        // Fit map to show all markers with better zoom
        if (markersRef.current.length > 0 && mapRef.current) {
          const group = L.featureGroup(markersRef.current);
          mapRef.current.fitBounds(group.getBounds(), {
            padding: [30, 30],
            maxZoom: 5
          });
        }
      } catch (error) {
        console.error('Error in location extraction:', error);
      }
    };

    extractLocations();
  }, [articles, isMapReady, isEnabled, sourceType]);

  // Si désactivé, afficher un bloc réduit
  if (!isEnabled) {
    return (
      <div className="hud-panel p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-primary uppercase tracking-wider">
            {t('map').toUpperCase()}
          </h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="map-toggle" className="text-[10px] text-muted-foreground cursor-pointer">
              {t('off').toUpperCase()}
            </Label>
            <Switch 
              id="map-toggle"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hud-panel h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wider">
          {t('map').toUpperCase()}
        </h2>
        <div className="flex items-center gap-2">
          <Label htmlFor="map-toggle" className="text-[10px] text-muted-foreground cursor-pointer">
            {t('on').toUpperCase()}
          </Label>
          <Switch 
            id="map-toggle"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>
      
      {articles.length === 0 ? (
        <div className="flex-1 rounded border border-primary/20 overflow-hidden flex items-center justify-center bg-card/20">
          <p className="text-xs text-muted-foreground">{t('noMapData')}</p>
        </div>
      ) : (
        <div 
          ref={mapContainerRef}
          className="flex-1 rounded border border-primary/30 overflow-hidden"
        />
      )}
    </div>
  );
};

export default MapModule;
