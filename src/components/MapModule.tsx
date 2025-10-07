import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapModuleProps {
  articles: any[];
}

// Fix Leaflet default marker icon issue - create once outside component
const customIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapModule = ({ articles }: MapModuleProps) => {
  // Memoize locations to prevent re-creation
  const locations = useMemo(() => {
    return articles
      .filter(article => article.source?.name)
      .slice(0, 10)
      .map((article, index) => ({
        id: `marker-${index}`,
        title: article.title,
        source: article.source.name,
        lat: 51.505 + (Math.random() - 0.5) * 20,
        lng: -0.09 + (Math.random() - 0.5) * 40,
        url: article.url
      }));
  }, [articles]);

  // If no articles, show empty state
  if (articles.length === 0) {
    return (
      <div className="hud-panel h-full">
        <h2 className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">
          CARTE GÉOGRAPHIQUE
        </h2>
        <div className="h-[calc(100%-2rem)] rounded border border-primary/20 overflow-hidden flex items-center justify-center bg-card/20">
          <p className="text-xs text-muted-foreground">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hud-panel h-full">
      <h2 className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">
        CARTE GÉOGRAPHIQUE
      </h2>
      <div className="h-[calc(100%-2rem)] rounded border border-primary/20 overflow-hidden">
        <MapContainer
          key="main-map"
          center={[51.505, -0.09]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map((location) => (
            <Marker
              key={location.id}
              position={[location.lat, location.lng]}
              icon={customIcon}
            >
              <Popup>
                <div className="text-xs">
                  <h3 className="font-bold text-primary mb-1">{location.source}</h3>
                  <p className="text-foreground mb-2">{location.title}</p>
                  <a 
                    href={location.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:text-secondary underline"
                  >
                    Read Article
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapModule;
