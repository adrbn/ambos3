import { Users, Building2, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";

interface Entity {
  name: string;
  type: 'person' | 'organization' | 'location';
  role: string;
  mentions: number;
}

interface GraphModuleProps {
  entities: Entity[];
  language: Language;
}

const GraphModule = ({ entities, language }: GraphModuleProps) => {
  const { t } = useTranslation(language);
  
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

  const getAvatarUrl = (name: string, type: string) => {
    // Use Wikipedia images for real photos
    const searchName = encodeURIComponent(name.replace(/\s+/g, '_'));
    
    if (type === 'person') {
      // Try to get Wikipedia thumbnail - will fallback to initials if not found
      return `https://en.wikipedia.org/wiki/Special:FilePath/${searchName}.jpg?width=100`;
    } else if (type === 'organization') {
      // For organizations, try logo from Wikipedia
      return `https://en.wikipedia.org/wiki/Special:FilePath/${searchName}_logo.svg?width=100`;
    } else {
      // For locations, try flag or emblem
      return `https://en.wikipedia.org/wiki/Special:FilePath/Flag_of_${searchName}.svg?width=100`;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="hud-panel h-full overflow-auto">
      <h2 className="text-xs font-bold text-primary mb-2 uppercase tracking-wider flex items-center gap-2">
        <span className="alert-indicator"></span>
        {t('keyEntities').toUpperCase()}
      </h2>
      
      {entities && entities.length > 0 ? (
        <div className="space-y-3">
          {entities.map((entity, index) => (
            <div
              key={index}
              className={`p-3 border rounded ${getColor(entity.type)} border-opacity-30 bg-card/30 hover:bg-card/50 transition-all group`}
            >
              <div className="flex items-start gap-3 mb-1">
                {/* Avatar */}
                <Avatar className="w-10 h-10 border-2 border-current">
                  <AvatarImage 
                    src={getAvatarUrl(entity.name, entity.type)} 
                    alt={entity.name}
                  />
                  <AvatarFallback className="text-xs font-bold">
                    {getInitials(entity.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-sm truncate">{entity.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        {getIcon(entity.type)}
                        <p className="text-xs text-muted-foreground uppercase">{entity.type}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono bg-primary/10 px-2 py-1 rounded shrink-0">
                      {entity.mentions}x
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{entity.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          {t('noEntities')}
        </div>
      )}
    </div>
  );
};

export default GraphModule;
