import { useState, useEffect } from "react";
import { Activity, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  lastChecked: Date;
  message?: string;
}

const ServiceStatusIndicator = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Query Enrichment', status: 'operational', lastChecked: new Date() },
    { name: 'News Analysis', status: 'operational', lastChecked: new Date() },
    { name: 'OSINT Sources', status: 'operational', lastChecked: new Date() },
    { name: 'Military RSS', status: 'operational', lastChecked: new Date() },
    { name: 'Gopher AI', status: 'operational', lastChecked: new Date() },
  ]);

  const checkServices = async () => {
    // Simuler un check de santé (à remplacer par de vrais health checks)
    const updatedServices: ServiceStatus[] = services.map(service => ({
      ...service,
      lastChecked: new Date(),
      status: (Math.random() > 0.1 ? 'operational' : 'degraded') as 'operational' | 'degraded' | 'down'
    }));
    setServices(updatedServices);
  };

  useEffect(() => {
    const interval = setInterval(checkServices, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-3 h-3 text-yellow-500" />;
      case 'down':
        return <AlertCircle className="w-3 h-3 text-destructive" />;
    }
  };

  const getOverallStatus = () => {
    if (services.some(s => s.status === 'down')) return 'down';
    if (services.some(s => s.status === 'degraded')) return 'degraded';
    return 'operational';
  };

  const overallStatus = getOverallStatus();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 px-2"
        >
          <Activity 
            className={`w-4 h-4 ${
              overallStatus === 'operational' ? 'text-green-500' : 
              overallStatus === 'degraded' ? 'text-yellow-500' : 
              'text-destructive'
            } ${overallStatus === 'operational' ? 'animate-pulse' : ''}`} 
          />
          <span className="text-xs hidden sm:inline">Services</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-card border-primary/30" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-primary uppercase">État des Services</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkServices}
              className="h-6 px-2"
            >
              <Clock className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="space-y-2">
            {services.map((service, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-card/50 border border-primary/10">
                <div className="flex items-center gap-2">
                  {getStatusIcon(service.status)}
                  <span className="text-xs font-medium">{service.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {service.lastChecked.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-primary/10">
            Dernière vérification : {services[0]?.lastChecked.toLocaleTimeString()}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ServiceStatusIndicator;