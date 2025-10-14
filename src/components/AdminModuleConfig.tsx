import { useState, useEffect } from "react";
import { Settings2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ModuleConfig {
  id: string;
  module_id: string;
  enabled: boolean;
}

const AdminModuleConfig = () => {
  const [configs, setConfigs] = useState<ModuleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const moduleNames: Record<string, string> = {
    'map': '🗺️ Carte Géographique',
    'timeline': '📅 Timeline',
    'network-graph': '🕸️ Graphe Relationnel 3D',
    'entities': '👥 Entités',
    'summary': '📝 Résumé IA',
    'predictions': '🔮 Prédictions',
    'datafeed': '📊 Flux de Données',
    'enrichment': '✨ Enrichissement de Requête',
    'osint-mastodon': '🐘 OSINT - Mastodon',
    'osint-bluesky': '☁️ OSINT - BlueSky',
    'osint-gopher': '🔍 OSINT - Gopher AI (X/Twitter)',
    'osint-military-rss': '🇮🇹 OSINT - Military RSS (IT)',
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('module_config')
        .select('*')
        .order('module_id');

      if (error) throw error;
      setConfigs(data || []);
    } catch (error: any) {
      console.error('Error loading configs:', error);
      toast.error('Échec du chargement des configurations');
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setConfigs(prev =>
      prev.map(c =>
        c.module_id === moduleId ? { ...c, enabled: !c.enabled } : c
      )
    );
  };

  const saveConfigs = async () => {
    setSaving(true);
    try {
      const updates = configs.map(config =>
        supabase
          .from('module_config')
          .update({ enabled: config.enabled })
          .eq('id', config.id)
      );

      await Promise.all(updates);
      toast.success('Configurations sauvegardées');
    } catch (error: any) {
      console.error('Error saving configs:', error);
      toast.error('Échec de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground py-8">Chargement...</div>;
  }

  return (
    <div className="hud-panel h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          CONFIGURATION MODULES (GLOBAL)
        </h2>
        <Button
          variant="default"
          size="sm"
          onClick={saveConfigs}
          disabled={saving}
          className="h-7 px-3 gap-2"
        >
          <Save className="w-3 h-3" />
          Sauvegarder
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Activez ou désactivez des modules pour tous les utilisateurs
      </p>

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {configs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between p-3 rounded bg-card/50 border border-primary/10"
            >
              <span className="text-xs font-medium">
                {moduleNames[config.module_id] || config.module_id}
              </span>
              <Switch
                checked={config.enabled}
                onCheckedChange={() => toggleModule(config.module_id)}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AdminModuleConfig;