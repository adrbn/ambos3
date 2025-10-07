import { Users, Building2, MapPin } from "lucide-react";

interface Entity {
  name: string;
  type: 'person' | 'organization' | 'location';
  role: string;
  mentions: number;
}

interface GraphModuleProps {
  entities: Entity[];
}

const GraphModule = ({ entities }: GraphModuleProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'person': return <Users className="w-4 h-4" />;
      case 'organization': return <Building2 className="w-4 h-4" />;
      case 'location': return <MapPin className="w-4 h-4" />;
      default: return null;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'person': return 'text-primary border-primary';
      case 'organization': return 'text-secondary border-secondary';
      case 'location': return 'text-accent border-accent';
      default: return 'text-foreground border-foreground';
    }
  };

  return (
    <div className="hud-panel h-full overflow-auto">
      <h2 className="text-sm font-bold text-primary mb-3 text-glow flex items-center gap-2">
        <span className="alert-indicator"></span>
        ENTITY NETWORK
      </h2>
      
      {entities && entities.length > 0 ? (
        <div className="space-y-3">
          {entities.map((entity, index) => (
            <div
              key={index}
              className={`p-3 border rounded ${getColor(entity.type)} border-opacity-30 bg-card/30 hover:bg-card/50 transition-all`}
            >
              <div className="flex items-start gap-2 mb-1">
                {getIcon(entity.type)}
                <div className="flex-1">
                  <h3 className="font-bold text-sm">{entity.name}</h3>
                  <p className="text-xs text-muted-foreground uppercase">{entity.type}</p>
                </div>
                <span className="text-xs font-mono bg-primary/10 px-2 py-1 rounded">
                  {entity.mentions}x
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{entity.role}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          No entities detected yet
        </div>
      )}
    </div>
  );
};

export default GraphModule;
