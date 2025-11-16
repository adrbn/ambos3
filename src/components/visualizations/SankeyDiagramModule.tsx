import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Network } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface SankeyNode {
  id: string;
  name: string;
  color?: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color?: string;
}

interface SankeyDiagramModuleProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  title?: string;
  description?: string;
}

/**
 * SankeyDiagramModule - Information flow visualization
 * Shows how information, influence, or resources flow between entities
 */
export function SankeyDiagramModule({ 
  nodes, 
  links, 
  title = "Flux d'information", 
  description 
}: SankeyDiagramModuleProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !nodes.length || !links.length) return;

    // Simplified Sankey visualization using SVG
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 400;

    // Clear existing content
    container.innerHTML = '';

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.background = 'transparent';

    // Group nodes by column (simple layout: sources left, targets right)
    const sources = new Set(links.map(l => l.source));
    const targets = new Set(links.map(l => l.target));
    const intermediates = new Set([...sources].filter(s => targets.has(s)));
    
    const leftNodes = [...sources].filter(s => !intermediates.has(s));
    const middleNodes = [...intermediates];
    const rightNodes = [...targets].filter(t => !sources.has(t));

    const allColumns = [leftNodes, middleNodes, rightNodes].filter(col => col.length > 0);
    const columnWidth = width / (allColumns.length + 1);
    
    // Calculate node positions
    const nodePositions = new Map<string, { x: number; y: number; height: number }>();
    
    allColumns.forEach((column, colIndex) => {
      const x = columnWidth * (colIndex + 1);
      const spacing = height / (column.length + 1);
      
      column.forEach((nodeId, rowIndex) => {
        const y = spacing * (rowIndex + 1);
        const node = nodes.find(n => n.id === nodeId);
        const nodeHeight = 40; // Fixed height for simplicity
        
        nodePositions.set(nodeId, { x, y, height: nodeHeight });
      });
    });

    // Draw links (curved paths)
    links.forEach(link => {
      const sourcePos = nodePositions.get(link.source);
      const targetPos = nodePositions.get(link.target);
      
      if (!sourcePos || !targetPos) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      
      // Curved path
      const midX = (sourcePos.x + targetPos.x) / 2;
      const pathData = `M ${sourcePos.x + 60} ${sourcePos.y} 
                        C ${midX} ${sourcePos.y}, 
                          ${midX} ${targetPos.y}, 
                          ${targetPos.x - 60} ${targetPos.y}`;
      
      path.setAttribute('d', pathData);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', link.color || '#3b82f6');
      path.setAttribute('stroke-width', Math.max(2, link.value / 10).toString());
      path.setAttribute('opacity', '0.4');
      path.style.transition = 'opacity 0.2s';
      
      // Hover effect
      path.addEventListener('mouseenter', () => {
        path.setAttribute('opacity', '0.8');
        path.setAttribute('stroke-width', (Math.max(2, link.value / 10) + 2).toString());
      });
      path.addEventListener('mouseleave', () => {
        path.setAttribute('opacity', '0.4');
        path.setAttribute('stroke-width', Math.max(2, link.value / 10).toString());
      });
      
      svg.appendChild(path);
    });

    // Draw nodes
    nodePositions.forEach((pos, nodeId) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      // Node rectangle
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (pos.x - 50).toString());
      rect.setAttribute('y', (pos.y - pos.height / 2).toString());
      rect.setAttribute('width', '100');
      rect.setAttribute('height', pos.height.toString());
      rect.setAttribute('rx', '6');
      rect.setAttribute('fill', node.color || '#6366f1');
      rect.setAttribute('opacity', '0.9');
      rect.style.cursor = 'pointer';
      
      // Hover effect
      rect.addEventListener('mouseenter', () => {
        rect.setAttribute('opacity', '1');
        rect.setAttribute('stroke', '#fff');
        rect.setAttribute('stroke-width', '2');
      });
      rect.addEventListener('mouseleave', () => {
        rect.setAttribute('opacity', '0.9');
        rect.setAttribute('stroke', 'none');
      });
      
      svg.appendChild(rect);

      // Node label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos.x.toString());
      text.setAttribute('y', pos.y.toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', '#fff');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', '500');
      text.style.pointerEvents = 'none';
      text.textContent = node.name.length > 12 ? node.name.substring(0, 12) + '...' : node.name;
      
      svg.appendChild(text);
    });

    container.appendChild(svg);
  }, [nodes, links]);

  const totalFlow = links.reduce((sum, link) => sum + link.value, 0);
  const uniqueSources = new Set(links.map(l => l.source)).size;
  const uniqueTargets = new Set(links.map(l => l.target)).size;

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-purple-500" />
          <CardTitle>{title}</CardTitle>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Sankey Diagram */}
        <div 
          ref={containerRef} 
          className="flex-1 rounded-lg border bg-background/50 min-h-[400px]"
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{uniqueSources}</div>
            <div className="text-xs text-muted-foreground">Sources</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{totalFlow}</div>
            <div className="text-xs text-muted-foreground">Flux total</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{uniqueTargets}</div>
            <div className="text-xs text-muted-foreground">Cibles</div>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-xs text-center text-muted-foreground">
          Survolez les nœuds et liens pour plus de détails
        </p>
      </CardContent>
    </Card>
  );
}

export default SankeyDiagramModule;

