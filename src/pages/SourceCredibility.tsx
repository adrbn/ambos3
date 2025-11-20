import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, TrendingUp, TrendingDown, Flag, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { demoSources } from '@/data/demoData';

export default function SourceCredibility() {
  const { data: sources, isLoading } = useQuery({
    queryKey: ['source_credibility'],
    queryFn: async () => {
      // Always use demo data since source_credibility table doesn't exist yet
      console.log('Using demo data for source credibility');
      return demoSources;
    }
  });

  const getCredibilityColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-blue-500';
    if (score >= 50) return 'text-yellow-500';
    if (score >= 30) return 'text-orange-500';
    return 'text-red-500';
  };

  const getCredibilityLabel = (score: number) => {
    if (score >= 90) return 'Excellente';
    if (score >= 75) return 'Très bonne';
    if (score >= 50) return 'Bonne';
    if (score >= 30) return 'Modérée';
    return 'Faible';
  };

  const getBiasColor = (bias: string) => {
    switch (bias) {
      case 'left': return 'bg-blue-500';
      case 'center-left': return 'bg-blue-400';
      case 'center': return 'bg-gray-500';
      case 'center-right': return 'bg-orange-400';
      case 'right': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'flagged': return <Flag className="w-4 h-4 text-red-500" />;
      case 'banned': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-8 h-8 animate-pulse mx-auto mb-4" />
          <p>Chargement des sources...</p>
        </div>
      </div>
    );
  }

  const highCredibility = sources?.filter(s => s.credibility_score >= 75) || [];
  const mediumCredibility = sources?.filter(s => s.credibility_score >= 50 && s.credibility_score < 75) || [];
  const lowCredibility = sources?.filter(s => s.credibility_score < 50) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-500" />
          Crédibilité des Sources
        </h1>
        <p className="text-muted-foreground mt-2">
          Évaluation et notation des sources d'information basée sur la fiabilité historique
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sources</p>
                <p className="text-3xl font-bold">{sources?.length || 0}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Haute crédibilité</p>
                <p className="text-3xl font-bold text-green-500">{highCredibility.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Crédibilité moyenne</p>
                <p className="text-3xl font-bold text-yellow-500">{mediumCredibility.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faible crédibilité</p>
                <p className="text-3xl font-bold text-red-500">{lowCredibility.length}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sources List with Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Toutes ({sources?.length || 0})</TabsTrigger>
          <TabsTrigger value="high">Haute ({highCredibility.length})</TabsTrigger>
          <TabsTrigger value="medium">Moyenne ({mediumCredibility.length})</TabsTrigger>
          <TabsTrigger value="low">Faible ({lowCredibility.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <SourcesList sources={sources || []} />
        </TabsContent>

        <TabsContent value="high" className="mt-6">
          <SourcesList sources={highCredibility} />
        </TabsContent>

        <TabsContent value="medium" className="mt-6">
          <SourcesList sources={mediumCredibility} />
        </TabsContent>

        <TabsContent value="low" className="mt-6">
          <SourcesList sources={lowCredibility} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SourcesList({ sources }: { sources: any[] }) {
  const getCredibilityColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-blue-500';
    if (score >= 50) return 'text-yellow-500';
    if (score >= 30) return 'text-orange-500';
    return 'text-red-500';
  };

  const getCredibilityLabel = (score: number) => {
    if (score >= 90) return 'Excellente';
    if (score >= 75) return 'Très bonne';
    if (score >= 50) return 'Bonne';
    if (score >= 30) return 'Modérée';
    return 'Faible';
  };

  const getBiasColor = (bias: string) => {
    switch (bias) {
      case 'left': return 'bg-blue-500';
      case 'center-left': return 'bg-blue-400';
      case 'center': return 'bg-gray-500';
      case 'center-right': return 'bg-orange-400';
      case 'right': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'flagged': return <Flag className="w-4 h-4 text-red-500" />;
      case 'banned': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="grid gap-4">
      {sources.map((source) => (
        <Card key={source.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">{source.source_name}</h3>
                  {getVerificationIcon(source.verification_status)}
                  <Badge variant="outline">{source.source_type}</Badge>
                  {source.country && (
                    <Badge variant="secondary">{source.country}</Badge>
                  )}
                </div>
              </div>
              <div className={`text-3xl font-bold ${getCredibilityColor(source.credibility_score)}`}>
                {source.credibility_score}
              </div>
            </div>

            <div className="space-y-3">
              {/* Credibility Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Crédibilité: {getCredibilityLabel(source.credibility_score)}</span>
                  <span className={getCredibilityColor(source.credibility_score)}>
                    {source.credibility_score}/100
                  </span>
                </div>
                <Progress value={source.credibility_score} className="h-2" />
              </div>

              {/* Bias */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Orientation politique:</span>
                <div className={`px-2 py-1 rounded text-xs text-white ${getBiasColor(source.bias_rating)}`}>
                  {source.bias_rating === 'left' && 'Gauche'}
                  {source.bias_rating === 'center-left' && 'Centre-gauche'}
                  {source.bias_rating === 'center' && 'Centre'}
                  {source.bias_rating === 'center-right' && 'Centre-droit'}
                  {source.bias_rating === 'right' && 'Droite'}
                  {source.bias_rating === 'unknown' && 'Inconnue'}
                </div>
              </div>

              {/* Fact Check Record */}
              {source.fact_check_record && (
                <div className="flex gap-4 text-sm">
                  <span className="text-green-500">
                    ✓ {source.fact_check_record.accurate || 0} précis
                  </span>
                  <span className="text-yellow-500">
                    ⚠ {source.fact_check_record.misleading || 0} trompeurs
                  </span>
                  <span className="text-red-500">
                    ✗ {source.fact_check_record.false || 0} faux
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {sources.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Aucune source dans cette catégorie</h3>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

