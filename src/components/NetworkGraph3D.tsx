import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';

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
  const [isEnabled, setIsEnabled] = useState(true);
  const [graphData, setGraphData] = useState<{ nodes: Node[]; links: Link[] }>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [activeTab, setActiveTab] = useState<string>('person');
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);

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
        
        // Filter out unimportant entities (keep only importance >= 6)
        const filteredNodes = data.nodes.filter((node: Node) => node.importance >= 6);
        const nodeIds = new Set(filteredNodes.map((n: Node) => n.id));
        
        // Filter out weak links and links with filtered nodes
        const filteredLinks = data.links.filter((link: Link) => 
          link.strength >= 3 && nodeIds.has(link.source) && nodeIds.has(link.target)
        );
        
        setGraphData({
          nodes: filteredNodes,
          links: filteredLinks
        });
        console.log(`Loaded ${filteredNodes.length} important entities with ${filteredLinks.length} strong relationships`);
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
          GRAPHE RELATIONNEL
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

  // Filtrer les données selon l'onglet actif
  const getFilteredData = () => {
    const filteredNodes = graphData.nodes.filter(node => node.type === activeTab);
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = graphData.links.filter(link => 
      nodeIds.has(link.source.toString()) && nodeIds.has(link.target.toString())
    );
    return { nodes: filteredNodes, links: filteredLinks };
  };

  const filteredData = getFilteredData();

  return (
    <div className="hud-panel h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wider">
          GRAPHE RELATIONNEL
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-2">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="person" className="text-[10px]">Personnes</TabsTrigger>
          <TabsTrigger value="location" className="text-[10px]">Lieux</TabsTrigger>
          <TabsTrigger value="organization" className="text-[10px]">Institutions</TabsTrigger>
        </TabsList>
      </Tabs>

      <div ref={containerRef} className="flex-1 rounded border border-primary/30 overflow-hidden" style={{ background: 'radial-gradient(circle at center, rgba(0, 217, 255, 0.05) 0%, rgba(0, 0, 0, 0.8) 100%)' }}>
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
        ) : filteredData.nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">Aucune entité de ce type</p>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={filteredData}
            width={containerRef.current?.offsetWidth || 600}
            height={containerRef.current?.offsetHeight || 300}
            nodeLabel={(node: any) => `${node.name} (${node.type})`}
            onNodeClick={(node: any) => setSelectedNode(node)}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              const nodeRadius = Math.sqrt(node.importance) * 3;
              
              // Draw node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
              ctx.fillStyle = getNodeColor(node.type);
              ctx.fill();
              
              // Draw glow
              ctx.shadowBlur = 10;
              ctx.shadowColor = getNodeColor(node.type);
              ctx.fill();
              ctx.shadowBlur = 0;
              
              // Draw label
              ctx.font = `${fontSize}px Orbitron, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#FFFFFF';
              ctx.fillText(label, node.x, node.y + nodeRadius + fontSize);
            }}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              const nodeRadius = Math.sqrt(node.importance) * 3;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            linkLabel={(link: any) => link.relationship}
            linkColor={() => 'rgba(0, 217, 255, 0.4)'}
            linkWidth={(link: any) => link.strength / 2}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleColor={() => '#00D9FF'}
            backgroundColor="transparent"
            enableZoomInteraction={true}
            enablePanInteraction={true}
            cooldownTime={3000}
            onEngineStop={() => {
              if (graphRef.current) {
                // Much tighter zoom with minimal padding
                const nodeCount = filteredData.nodes.length;
                const basePadding = 40;
                const additionalPadding = Math.min(nodeCount * 2, 50);
                const totalPadding = basePadding + additionalPadding;
                graphRef.current.zoomToFit(400, totalPadding);
              }
            }}
          />
        )}
      </div>

      {filteredData.nodes.length > 0 && (
        <div className="mt-2 text-[10px] text-muted-foreground text-center">
          {filteredData.nodes.length} entité{filteredData.nodes.length > 1 ? 's' : ''} • {filteredData.links.length} relation{filteredData.links.length > 1 ? 's' : ''}
        </div>
      )}
      
      {/* Node Info Card */}
      {selectedNode && (
        <Card className="absolute top-4 right-4 p-4 max-w-sm bg-card/95 border-primary/50 shadow-lg overflow-y-auto max-h-[80vh]">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-bold text-primary uppercase">{selectedNode.name}</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Type:</span>
              <span className="ml-2 px-2 py-0.5 rounded" style={{ 
                backgroundColor: `${getNodeColor(selectedNode.type)}20`,
                color: getNodeColor(selectedNode.type),
                border: `1px solid ${getNodeColor(selectedNode.type)}40`
              }}>
                {selectedNode.type}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Importance:</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-card rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all" 
                    style={{ width: `${selectedNode.importance * 10}%` }}
                  />
                </div>
                <span className="text-foreground font-bold">{selectedNode.importance}/10</span>
              </div>
            </div>
            {selectedNode.description && (
              <div>
                <span className="text-muted-foreground">Description:</span>
                <p className="mt-1 text-foreground/80 leading-relaxed">{selectedNode.description}</p>
              </div>
            )}
            
            {/* Connected Entities */}
            {(() => {
              const connections = graphData.links.filter(
                link => link.source === selectedNode.id || link.target === selectedNode.id
              );
              
              if (connections.length === 0) return null;
              
              return (
                <div className="pt-2 border-t border-primary/20">
                  <span className="text-muted-foreground font-semibold">
                    Connexions ({connections.length})
                  </span>
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {connections.map((link, idx) => {
                      const isSource = link.source === selectedNode.id;
                      const otherId = isSource ? link.target : link.source;
                      const otherNode = graphData.nodes.find(n => n.id === otherId);
                      
                      if (!otherNode) return null;
                      
                      return (
                        <div 
                          key={idx}
                          className="p-2 rounded bg-card/50 border border-primary/20 hover:border-primary/40 transition-all cursor-pointer"
                          onClick={() => setSelectedNode(otherNode)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="font-semibold text-foreground">{otherNode.name}</div>
                              <div className="text-[10px] text-muted-foreground capitalize">{otherNode.type}</div>
                            </div>
                            <div className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                              {link.strength}/10
                            </div>
                          </div>
                          <div className="mt-1 text-[10px] italic text-primary/70">
                            {isSource ? '→' : '←'} {link.relationship}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>
      )}
    </div>
  );
};

export default NetworkGraph3D;
