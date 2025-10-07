import { Activity, Database, Wifi, Clock } from "lucide-react";
import { useState, useEffect } from "react";

const StatusBar = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-card/50 border-t border-primary/30 px-2 sm:px-4 py-2">
      <div className="flex items-center justify-between text-[10px] sm:text-xs font-mono gap-2">
        <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
            <Activity className="w-3 h-3 text-primary animate-pulse" />
            <span className="text-primary hidden sm:inline">SYSTEM ACTIVE</span>
            <span className="text-primary sm:hidden">ACTIVE</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
            <Database className="w-3 h-3 text-secondary" />
            <span className="text-muted-foreground hidden sm:inline">CLOUD CONNECTED</span>
            <span className="text-muted-foreground sm:hidden">CLOUD</span>
          </div>
          <div className="hidden md:flex items-center gap-2 whitespace-nowrap">
            <Wifi className="w-3 h-3 text-primary" />
            <span className="text-muted-foreground">NETWORK OK</span>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
          <Clock className="w-3 h-3 text-primary" />
          <span className="text-primary font-bold">
            {time.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: false 
            })}
          </span>
          <span className="text-muted-foreground hidden sm:inline">UTC</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
