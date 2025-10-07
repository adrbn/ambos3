import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface MapModuleProps {
  articles: any[];
}

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MapModule = ({ articles }: MapModuleProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  // Initialize map once when enabled
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !isEnabled) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [20, 0],
        zoom: 2,
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

      // Cleanup
      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
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
          body: JSON.stringify({ articles }),
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
            const marker = L.marker([location.lat, location.lng])
              .bindPopup(`
                <div style="font-size: 12px; max-width: 200px;">
                  <h3 style="font-weight: bold; color: #00D9FF; margin-bottom: 4px;">${location.name}</h3>
                  <p style="margin-bottom: 4px; font-style: italic; font-size: 10px;">${location.relevance}</p>
                  <p style="margin-bottom: 8px;">${article.title}</p>
                  <a href="${article.url}" target="_blank" rel="noopener noreferrer" style="color: #00D9FF; text-decoration: underline;">
                    Lire l'article
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
      } catch (error) {
        console.error('Error in location extraction:', error);
      }
    };

    extractLocations();
  }, [articles, isMapReady, isEnabled]);

  // Si désactivé, afficher un bloc réduit
  if (!isEnabled) {
    return (
      <div className="hud-panel p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-primary uppercase tracking-wider">
            CARTE GÉOGRAPHIQUE
          </h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="map-toggle" className="text-[10px] text-muted-foreground cursor-pointer">
              OFF
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
    <div className="hud-panel h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wider">
          CARTE GÉOGRAPHIQUE
        </h2>
        <div className="flex items-center gap-2">
          <Label htmlFor="map-toggle" className="text-[10px] text-muted-foreground cursor-pointer">
            ON
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
        <div className="h-[calc(100%-2rem)] rounded border border-primary/20 overflow-hidden flex items-center justify-center bg-card/20">
          <p className="text-xs text-muted-foreground">Aucune donnée disponible</p>
        </div>
      ) : (
        <div 
          ref={mapContainerRef}
          className="h-[calc(100%-2rem)] rounded border border-primary/30 overflow-hidden"
        />
      )}
    </div>
  );
};

export default MapModule;
