import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Key, Save } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";

interface AdminApiKeysProps {
  language: Language;
}

const AdminApiKeys = ({ language }: AdminApiKeysProps) => {
  const { t } = useTranslation(language);
  const [keys, setKeys] = useState({
    googleApiKey: "",
    googleSearchEngineId: "",
    gopherApiKey: "",
  });

  const [saving, setSaving] = useState<string | null>(null);

  const updateSecret = async (secretName: string, value: string) => {
    if (!value.trim()) {
      toast.error("La valeur ne peut pas être vide");
      return;
    }

    setSaving(secretName);
    try {
      // Call edge function to update secret
      const { error } = await supabase.functions.invoke('update-secret', {
        body: { secretName, value }
      });

      if (error) throw error;
      
      toast.success(`${secretName} mis à jour avec succès`);
      setKeys(prev => ({ ...prev, [secretName]: "" }));
    } catch (error: any) {
      console.error('Error updating secret:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSaving(null);
    }
  };

  const apiKeyConfigs = [
    {
      key: 'googleApiKey',
      name: 'GOOGLE_API_KEY',
      label: 'Google API Key',
      description: 'Clé API pour Google Custom Search',
    },
    {
      key: 'googleSearchEngineId',
      name: 'GOOGLE_SEARCH_ENGINE_ID',
      label: 'Google Search Engine ID',
      description: 'ID du moteur de recherche personnalisé Google',
    },
    {
      key: 'gopherApiKey',
      name: 'GOPHER_API_KEY',
      label: 'Gopher AI API Key',
      description: 'Clé API pour Gopher AI (Twitter/X)',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Keys
        </CardTitle>
        <CardDescription>
          Gérer les clés API pour les services externes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {apiKeyConfigs.map((config) => (
          <div key={config.key} className="space-y-2">
            <Label>{config.label}</Label>
            <p className="text-xs text-muted-foreground mb-2">{config.description}</p>
            <div className="flex gap-2">
              <Input
                type="password"
                value={keys[config.key as keyof typeof keys]}
                onChange={(e) => setKeys(prev => ({ ...prev, [config.key]: e.target.value }))}
                placeholder="••••••••••••••••"
                className="flex-1"
              />
              <Button
                onClick={() => updateSecret(config.name, keys[config.key as keyof typeof keys])}
                disabled={saving === config.name || !keys[config.key as keyof typeof keys].trim()}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving === config.name ? "Enregistrement..." : "Mettre à jour"}
              </Button>
            </div>
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            ℹ️ Les clés API sont stockées de manière sécurisée et ne sont jamais exposées côté client.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminApiKeys;
