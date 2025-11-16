import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Thermometer, ZoomIn, ZoomOut } from 'lucide-react';

interface HeatMapData {
  lat: number;
  lng: number;
  intensity: number;
  label?: string;
}

interface HeatMapModuleProps {
  data: HeatMapData[];
  title?: string;
  description?: string;
}

/**
 * HeatMapModule - Advanced visualization for event density
 * Shows geographical concentration of events with color intensity
 */
export function HeatMapModule({ data, title = "Carte de chaleur", description }: HeatMapModuleProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [heatLayer, setHeatLayer] = useState<any>(null);
  const [radius, setRadius] = useState([25]);
  const [blur, setBlur] = useState([15]);
  const [maxIntensity, setMaxIntensity] = useState([1]);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Dynamically import Leaflet (avoid SSR issues)
    const loadMap = async () => {
      const L = await import('leaflet');
      await import('leaflet.heat');
      await import('leaflet/dist/leaflet.css');

      if (!mapRef.current || map) return;

      // Create map
      const newMap = L.map(mapRef.current).setView([46.5, 2.5], 6);

      // Use dark CartoDB tiles for consistency with AMBOS dark theme
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB',
        maxZoom: 18,
      }).addTo(newMap);

      setMap(newMap);
    };

    loadMap();

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!map || !data.length) return;

    // Remove existing heat layer
    if (heatLayer) {
      map.removeLayer(heatLayer);
    }

    // @ts-ignore - leaflet.heat types
    const L = window.L;
    if (!L?.heatLayer) return;

    // Convert data to heat layer format
    const heatData = data.map(point => [point.lat, point.lng, point.intensity]);

    // Create heat layer
    // @ts-ignore
    const newHeatLayer = L.heatLayer(heatData, {
      radius: radius[0],
      blur: blur[0],
      maxZoom: 17,
      max: maxIntensity[0],
      gradient: {
        0.0: '#0000ff',
        0.2: '#00ffff',
        0.4: '#00ff00',
        0.6: '#ffff00',
        0.8: '#ff8800',
        1.0: '#ff0000'
      }
    }).addTo(map);

    setHeatLayer(newHeatLayer);
  }, [map, data, radius, blur, maxIntensity]);

  const zoomIn = () => {
    if (map) map.zoomIn();
  };

  const zoomOut = () => {
    if (map) map.zoomOut();
  };

  const resetView = () => {
    if (map) map.setView([46.5, 2.5], 6);
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-orange-500" />
            <CardTitle>{title}</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={zoomIn} title="Zoom avant">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={zoomOut} title="Zoom arrière">
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Map Container */}
        <div ref={mapRef} className="flex-1 rounded-lg border min-h-[400px]" />

        {/* Controls */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Rayon: {radius[0]}px</span>
            </div>
            <Slider
              value={radius}
              onValueChange={setRadius}
              min={10}
              max={50}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Flou: {blur[0]}px</span>
            </div>
            <Slider
              value={blur}
              onValueChange={setBlur}
              min={5}
              max={30}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Intensité max: {maxIntensity[0].toFixed(1)}</span>
            </div>
            <Slider
              value={maxIntensity}
              onValueChange={setMaxIntensity}
              min={0.1}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          <Button variant="outline" onClick={resetView} className="w-full">
            Réinitialiser la vue
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-4">
          <span>Faible</span>
          <div className="flex-1 mx-4 h-2 rounded-full bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500" />
          <span>Élevé</span>
        </div>

        {/* Stats */}
        <div className="flex justify-around text-center text-sm">
          <div>
            <div className="font-semibold">{data.length}</div>
            <div className="text-muted-foreground">Points</div>
          </div>
          <div>
            <div className="font-semibold">
              {data.length > 0 ? (data.reduce((sum, p) => sum + p.intensity, 0) / data.length).toFixed(2) : 0}
            </div>
            <div className="text-muted-foreground">Intensité moy.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default HeatMapModule;

