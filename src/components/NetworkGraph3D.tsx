import { useEffect, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Node {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'location' | 'event' | 'date';
  importance: number;
  description?: string;
}

interface Link {
  source: string;
  target: string;
  relationship: string;
  strength: number;
}

interface NetworkGraph3DProps {
  articles: any[];
}

const NetworkGraph3D = ({ articles }: NetworkGraph3DProps) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [graphData, setGraphData] = useState<{ nodes: Node[]; links: Link[] }>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEnabled || articles.length === 0) return;

    const extractEntities = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-entities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ articles }),
        });

        if (!response.ok) {
          console.error('Error extracting entities:', response.statusText);
          return;
        }

        const data = await response.json();
        setGraphData(data);
        console.log(`Loaded ${data.nodes.length} entities with ${data.links.length} relationships`);
      } catch (error) {
        console.error('Error in entity extraction:', error);
      } finally {
        setIsLoading(false);
      }
    };

    extractEntities();
  }, [articles, isEnabled]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'person': return '#00D9FF';      // Cyan
      case 'organization': return '#FF6B9D'; // Pink
      case 'location': return '#00FF9F';     // Green
      case 'event': return '#FFD700';        // Gold
      case 'date': return '#9D4EDD';         // Purple
      default: return '#FFFFFF';
    }
  };

  if (!isEnabled) {
    return (
      <div className="hud-panel p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-primary uppercase tracking-wider">
            GRAPHE RELATIONNEL 3D
          </h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="graph-toggle" className="text-[10px] text-muted-foreground cursor-pointer">
              OFF
            </Label>
            <Switch 
              id="graph-toggle"
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
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wider">
          GRAPHE RELATIONNEL 3D
        </h2>
        <div className="flex items-center gap-2">
          <Label htmlFor="graph-toggle" className="text-[10px] text-muted-foreground cursor-pointer">
            ON
          </Label>
          <Switch 
            id="graph-toggle"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>

      <div ref={containerRef} className="flex-1 rounded border border-primary/30 overflow-hidden bg-black/40">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-xs text-muted-foreground">Analyse en cours...</p>
            </div>
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">Aucune donnée disponible</p>
          </div>
        ) : (
          <ForceGraph3D
            graphData={graphData}
            nodeLabel={(node: any) => `
              <div style="background: rgba(0,0,0,0.9); padding: 8px; border-radius: 4px; border: 1px solid ${getNodeColor(node.type)};">
                <strong style="color: ${getNodeColor(node.type)};">${node.name}</strong><br/>
                <span style="color: #888; font-size: 10px; text-transform: uppercase;">${node.type}</span><br/>
                ${node.description ? `<span style="color: #ccc; font-size: 11px;">${node.description}</span>` : ''}
              </div>
            `}
            nodeColor={(node: any) => getNodeColor(node.type)}
            nodeRelSize={6}
            nodeVal={(node: any) => node.importance}
            linkLabel={(link: any) => link.relationship}
            linkColor={() => 'rgba(0, 217, 255, 0.3)'}
            linkWidth={(link: any) => link.strength / 2}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={2}
            backgroundColor="rgba(0,0,0,0)"
            showNavInfo={false}
          />
        )}
      </div>

      {graphData.nodes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: '#00D9FF' }}></div>
            <span className="text-muted-foreground">Personnes</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: '#FF6B9D' }}></div>
            <span className="text-muted-foreground">Organisations</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: '#00FF9F' }}></div>
            <span className="text-muted-foreground">Lieux</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: '#FFD700' }}></div>
            <span className="text-muted-foreground">Événements</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkGraph3D;
