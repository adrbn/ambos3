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
  const [isEnabled, setIsEnabled] = useState(false);

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

      // Use OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
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

  // Update markers when articles change
  useEffect(() => {
    if (!mapRef.current || !isMapReady || !isEnabled) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (articles.length === 0) return;

    // Add new markers
    const locations = articles
      .filter(article => article.source?.name)
      .slice(0, 10)
      .map((article, index) => ({
        title: article.title,
        source: article.source.name,
        lat: 20 + (Math.random() - 0.5) * 40,
        lng: 0 + (Math.random() - 0.5) * 80,
        url: article.url
      }));

    locations.forEach((location) => {
      try {
        const marker = L.marker([location.lat, location.lng])
          .bindPopup(`
            <div style="font-size: 12px; max-width: 200px;">
              <h3 style="font-weight: bold; color: #00D9FF; margin-bottom: 4px;">${location.source}</h3>
              <p style="margin-bottom: 8px;">${location.title}</p>
              <a href="${location.url}" target="_blank" rel="noopener noreferrer" style="color: #00D9FF; text-decoration: underline;">
                Read Article
              </a>
            </div>
          `)
          .addTo(mapRef.current!);
        
        markersRef.current.push(marker);
      } catch (error) {
        console.error('Error adding marker:', error);
      }
    });
  }, [articles, isMapReady, isEnabled]);

  return (
    <div className="hud-panel h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wider">
          CARTE GÉOGRAPHIQUE
        </h2>
        <div className="flex items-center gap-2">
          <Label htmlFor="map-toggle" className="text-[10px] text-muted-foreground cursor-pointer">
            {isEnabled ? 'ON' : 'OFF'}
          </Label>
          <Switch 
            id="map-toggle"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>
      
      {!isEnabled ? (
        <div className="h-[calc(100%-2rem)] rounded border border-primary/20 overflow-hidden flex items-center justify-center bg-card/20">
          <p className="text-xs text-muted-foreground">Carte désactivée</p>
        </div>
      ) : articles.length === 0 ? (
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
