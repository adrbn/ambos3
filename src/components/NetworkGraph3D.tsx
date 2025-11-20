import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';

interface Node {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'location' | 'event' | 'date';
  importance: number;
  description?: string;
  image_url?: string;
  title?: string;
  country?: string;
  influence_score?: number;
}

interface Link {
  source: string;
  target: string;
  relationship: string;
  strength: number;
  direction?: 'bidirectional' | 'directional';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    if (!isEnabled || articles.length === 0) return;

    // Delay to avoid rate limiting - let analyze-news fully complete (8s)
    const timeoutId = setTimeout(() => {
      extractEntities();
    }, 8000); // Wait 8 seconds before calling extract-entities

    return () => clearTimeout(timeoutId);
  }, [articles, isEnabled]);

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
      
      const filteredNodes = data.nodes.filter((node: Node) => node.importance >= 6);
      const nodeIds = new Set(filteredNodes.map((n: Node) => n.id));
      
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

  if (!isEnabled) return null;

  const filteredData = {
    nodes: graphData.nodes.filter(node => {
      if (activeTab === 'person') return node.type === 'person';
      if (activeTab === 'location') return node.type === 'location';
      if (activeTab === 'organization') return node.type === 'organization';
      return false;
    }),
    links: graphData.links.filter(link => {
      const sourceNode = graphData.nodes.find(n => n.id === link.source);
      const targetNode = graphData.nodes.find(n => n.id === link.target);
      
      if (activeTab === 'person') {
        return sourceNode?.type === 'person' && targetNode?.type === 'person';
      }
      if (activeTab === 'location') {
        return sourceNode?.type === 'location' && targetNode?.type === 'location';
      }
      if (activeTab === 'organization') {
        return sourceNode?.type === 'organization' && targetNode?.type === 'organization';
      }
      return false;
    })
  };

  const containerClasses = isFullscreen
    ? "fixed inset-0 z-50 bg-background p-4 flex flex-col"
    : "flex flex-col h-full";

  const graphWidth = isFullscreen 
    ? window.innerWidth - 32 
    : containerRef.current?.offsetWidth || 600;
  const graphHeight = isFullscreen 
    ? window.innerHeight - 180 
    : containerRef.current?.offsetHeight || 300;

  const getNodeColor = (node: Node): string => {
    const baseColors = {
      person: '#3b82f6',
      organization: '#8b5cf6',
      location: '#10b981',
      event: '#f59e0b',
      date: '#6366f1'
    };
    
    return baseColors[node.type] || '#6b7280';
  };

  return (
    <Card className={containerClasses}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-mono text-primary">🕸️ Graphe Relationnel</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 w-7"
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTimeout(async () => {
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
                  const data = await response.json();
                  const filteredNodes = data.nodes.filter((node: Node) => node.importance >= 6);
                  const nodeIds = new Set(filteredNodes.map((n: Node) => n.id));
                  const filteredLinks = data.links.filter((link: Link) => 
                    link.strength >= 3 && nodeIds.has(link.source) && nodeIds.has(link.target)
                  );
                  setGraphData({ nodes: filteredNodes, links: filteredLinks });
                } catch (error) {
                  console.error('Error:', error);
                } finally {
                  setIsLoading(false);
                }
              }, 100);
            }}
            className="h-7 w-7"
            title="Recharger le graphe"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEnabled(false)}
            className="h-7 w-7"
          >
            <X className="w-3 h-3" />
          </Button>
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
            width={graphWidth}
            height={graphHeight}
            nodeLabel={(node: any) => `${node.name} (${node.type})`}
            onNodeClick={(node: any, event: MouseEvent) => {
              event.stopPropagation();
              setSelectedNode(node);
            }}
            linkLabel={(link: any) => `${link.relationship} (force: ${link.strength})`}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            linkWidth={(link: any) => Math.max(0.5, link.strength * 0.3)}
            linkColor={(link: any) => {
              const strength = link.strength || 5;
              if (strength >= 8) return 'rgba(239, 68, 68, 0.8)';
              if (strength >= 6) return 'rgba(249, 115, 22, 0.7)';
              if (strength >= 4) return 'rgba(59, 130, 246, 0.6)';
              return 'rgba(107, 114, 128, 0.4)';
            }}
            linkDirectionalParticles={(link: any) => link.strength >= 7 ? 2 : 0}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleWidth={2}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              const nodeSize = Math.max(4, (node.importance || 5) + (node.influence_score || 0) * 0.5);
              
              ctx.save();
              
              if (node.image_url && node.type === 'person') {
                let img = imageCache.current.get(node.image_url);
                
                if (!img) {
                  img = new Image();
                  img.crossOrigin = 'anonymous';
                  img.src = node.image_url;
                  imageCache.current.set(node.image_url, img);
                  
                  img.onload = () => {
                    if (graphRef.current) {
                      graphRef.current.refresh();
                    }
                  };
                }
                
                if (img.complete && img.naturalWidth > 0) {
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
                  ctx.closePath();
                  ctx.clip();
                  
                  ctx.drawImage(
                    img,
                    node.x - nodeSize,
                    node.y - nodeSize,
                    nodeSize * 2,
                    nodeSize * 2
                  );
                  
                  ctx.restore();
                  ctx.save();
                  
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
                  ctx.strokeStyle = getNodeColor(node);
                  ctx.lineWidth = 2 / globalScale;
                  ctx.stroke();
                } else {
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
                  ctx.fillStyle = getNodeColor(node);
                  ctx.fill();
                  ctx.strokeStyle = '#fff';
                  ctx.lineWidth = 1.5 / globalScale;
                  ctx.stroke();
                }
              } else {
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
                ctx.fillStyle = getNodeColor(node);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5 / globalScale;
                ctx.stroke();
              }
              
              ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#fff';
              ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
              ctx.shadowBlur = 4;
              ctx.fillText(label, node.x, node.y + nodeSize + fontSize + 2);
              
              ctx.restore();
            }}
            nodeCanvasObjectMode={() => 'replace'}
            cooldownTicks={100}
            onEngineStop={() => graphRef.current?.zoomToFit(400)}
          />
        )}
      </div>

      {selectedNode && (
        <div className="mt-2 p-2 bg-card/50 rounded border border-primary/30 text-xs space-y-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-mono text-primary font-semibold">{selectedNode.name}</p>
              {selectedNode.title && <p className="text-muted-foreground text-[10px]">{selectedNode.title}</p>}
              {selectedNode.description && <p className="text-muted-foreground mt-1">{selectedNode.description}</p>}
              {selectedNode.country && <p className="text-[10px] text-muted-foreground mt-1">📍 {selectedNode.country}</p>}
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded">
                  Importance: {selectedNode.importance}/10
                </span>
                {selectedNode.influence_score && (
                  <span className="text-[10px] px-2 py-0.5 bg-accent/20 text-accent rounded">
                    Influence: {selectedNode.influence_score}/10
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedNode(null)}
              className="h-6 w-6 ml-2"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {isFullscreen && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          💡 Cliquez et glissez pour déplacer • Molette pour zoomer • Cliquez sur un nœud pour plus d'infos
        </div>
      )}
    </Card>
  );
};

export default NetworkGraph3D;
