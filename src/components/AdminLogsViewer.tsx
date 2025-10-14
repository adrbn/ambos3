import { useState, useEffect } from "react";
import { Terminal, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  source: string;
}

const AdminLogsViewer = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Simuler des logs en temps réel (à remplacer par vrai système de logs)
  useEffect(() => {
    const generateMockLog = (): LogEntry => {
      const levels: LogEntry['level'][] = ['info', 'error', 'warn'];
      const sources = ['fetch-news', 'analyze-news', 'enrich-query', 'fetch-gopher', 'fetch-military-rss'];
      const messages = [
        'Request completed successfully',
        'Rate limit exceeded',
        'AI Gateway error: 429',
        'Fetching data from source',
        'Processing query enrichment'
      ];

      return {
        timestamp: new Date().toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        source: sources[Math.floor(Math.random() * sources.length)]
      };
    };

    if (autoRefresh) {
      const interval = setInterval(() => {
        setLogs(prev => [generateMockLog(), ...prev].slice(0, 100));
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(filter.toLowerCase()) ||
    log.source.toLowerCase().includes(filter.toLowerCase())
  );

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'warn': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'info': return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  return (
    <div className="hud-panel h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          LOGS EN TEMPS RÉEL
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="h-7 px-2"
          >
            <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLogs([])}
            className="h-7 px-2 text-xs"
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="mb-2">
        <div className="relative">
          <Input
            type="text"
            placeholder="Filtrer les logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 pl-8 text-xs bg-card/50"
          />
          <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 font-mono text-xs">
          {filteredLogs.map((log, i) => (
            <div key={i} className={`p-2 rounded border ${getLevelColor(log.level)}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] font-mono">
                  {log.source}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs">{log.message}</p>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Aucun log à afficher
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AdminLogsViewer;