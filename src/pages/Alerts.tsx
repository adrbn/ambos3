import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, Plus, Trash2, Edit, Activity, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { demoAlerts } from '@/data/demoData';

export default function Alerts() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [alertName, setAlertName] = useState('');
  const [alertType, setAlertType] = useState('keyword');
  const [alertLevel, setAlertLevel] = useState('medium');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const queryClient = useQueryClient();

  // Fetch alerts
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });
      
      // If error or no data, return demo data
      if (error || !data || data.length === 0) {
        console.log('Using demo data for alerts');
        return demoAlerts;
      }
      return data;
    }
  });

  // Delete alert mutation
  const deleteMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alerte supprimée');
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  // Toggle alert active status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('alerts')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });

  // Test alert mutation
  const testMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase.functions.invoke('test-alert', {
        body: {
          alert_id: alertId,
          test_message: '🧪 Test manuel depuis l\'interface AMBOS'
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alerte de test envoyée ! Vérifiez votre Discord/Email.');
    },
    onError: (error: any) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    return <Bell className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Chargement des alertes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="w-8 h-8" />
            Gestion des Alertes
          </h1>
          <p className="text-muted-foreground mt-2">
            Créez et gérez des alertes automatiques pour surveiller les événements critiques
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle alerte
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Créer une nouvelle alerte</CardTitle>
            <CardDescription>
              Configurez les conditions et les canaux de notification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l'alerte</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Alerte cyber-attaque" 
                  value={alertName}
                  onChange={(e) => setAlertName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={alertType} onValueChange={setAlertType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Mot-clé</SelectItem>
                    <SelectItem value="entity">Entité</SelectItem>
                    <SelectItem value="sentiment">Sentiment</SelectItem>
                    <SelectItem value="threat">Menace</SelectItem>
                    <SelectItem value="volume">Volume</SelectItem>
                    <SelectItem value="anomaly">Anomalie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Niveau de gravité</Label>
              <Select value={alertLevel} onValueChange={setAlertLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyen</SelectItem>
                  <SelectItem value="high">Élevé</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook">Discord Webhook URL (optionnel)</Label>
              <Input 
                id="webhook"
                type="url"
                placeholder="https://discord.com/api/webhooks/..." 
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Pour recevoir des notifications Discord en temps réel
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optionnel)</Label>
              <Input 
                id="email"
                type="email"
                placeholder="votre@email.com" 
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => {
                if (!alertName) {
                  toast.error('Veuillez entrer un nom pour l\'alerte');
                  return;
                }
                toast.success(`Alerte "${alertName}" créée! (Demo mode)`);
                setShowCreateForm(false);
                setAlertName('');
              }}>
                Créer l'alerte
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts List */}
      <div className="grid gap-4">
        {alerts && alerts.length > 0 ? (
          alerts.map((alert: any) => (
            <Card key={alert.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getAlertTypeIcon(alert.alert_type)}
                      <h3 className="text-lg font-semibold">{alert.name}</h3>
                      <Badge variant={getAlertLevelColor(alert.alert_level)}>
                        {alert.alert_level}
                      </Badge>
                      <Badge variant={alert.is_active ? 'default' : 'outline'}>
                        {alert.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Type: <span className="font-medium">{alert.alert_type}</span></p>
                      {alert.trigger_count > 0 && (
                        <p>Déclenchée {alert.trigger_count} fois</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.webhook_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testMutation.mutate(alert.id)}
                        disabled={testMutation.isPending}
                        title="Tester l'alerte (envoi Discord)"
                      >
                        <Zap className="w-4 h-4 mr-1" />
                        Tester
                      </Button>
                    )}
                    <Switch
                      checked={alert.is_active}
                      onCheckedChange={(checked) => 
                        toggleMutation.mutate({ id: alert.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(alert.id)}
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Aucune alerte configurée</h3>
              <p className="text-muted-foreground mb-4">
                Créez votre première alerte pour commencer la surveillance automatique
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une alerte
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

