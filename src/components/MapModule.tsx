import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapModuleProps {
  articles: any[];
}

// Fix Leaflet default marker icon issue
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
  // Extract locations with coordinates (if available in articles)
  const locations = articles
    .filter(article => article.source?.name)
    .slice(0, 10) // Limit to 10 markers
    .map((article, index) => ({
      id: index,
      title: article.title,
      source: article.source.name,
      lat: 51.505 + (Math.random() - 0.5) * 20, // Random coordinates for demo
      lng: -0.09 + (Math.random() - 0.5) * 40,
      url: article.url
    }));

  return (
    <div className="hud-panel h-full">
      <h2 className="text-sm font-bold text-primary mb-3 text-glow flex items-center gap-2">
        <span className="alert-indicator"></span>
        GEOLOCATION MAP
      </h2>
      <div className="h-[calc(100%-2rem)] rounded border border-primary/30 overflow-hidden">
        <MapContainer
          center={[51.505, -0.09]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
