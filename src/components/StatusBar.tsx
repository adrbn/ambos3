import { Activity, Database, Wifi, Clock } from "lucide-react";
import { useState, useEffect } from "react";

const StatusBar = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-card/50 border-t border-primary/30 px-4 py-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-primary animate-pulse" />
            <span className="text-primary">SYSTEM ACTIVE</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3 text-secondary" />
            <span className="text-muted-foreground">CLOUD CONNECTED</span>
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="w-3 h-3 text-primary" />
            <span className="text-muted-foreground">NETWORK OK</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-primary" />
          <span className="text-primary font-bold">
            {time.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: false 
            })}
          </span>
          <span className="text-muted-foreground">UTC</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
