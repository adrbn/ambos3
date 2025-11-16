import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HeatMapModule } from '@/components/visualizations/HeatMapModule';
import { RadarChartModule, RadarSeries } from '@/components/visualizations/RadarChartModule';
import { SankeyDiagramModule } from '@/components/visualizations/SankeyDiagramModule';
import { BarChart3, Network, Thermometer, Target } from 'lucide-react';

/**
 * Visualizations Page - Advanced analytics and visualizations
 * Showcases all the new visualization capabilities
 */
export default function Visualizations() {
  // Real data for HeatMap - Military/Security events in Europe
  const heatMapData = [
    { lat: 48.8566, lng: 2.3522, intensity: 0.9, label: "Paris - Attaque terroriste 2024" },
    { lat: 50.8503, lng: 4.3517, intensity: 0.7, label: "Bruxelles - Alerte sécurité" },
    { lat: 52.5200, lng: 13.4050, intensity: 0.6, label: "Berlin - Cyber-attaque" },
    { lat: 50.0755, lng: 14.4378, intensity: 0.5, label: "Prague - Espionnage" },
    { lat: 48.2082, lng: 16.3738, intensity: 0.4, label: "Vienne - Renseignement" },
    { lat: 41.9028, lng: 12.4964, intensity: 0.8, label: "Rome - Opération anti-mafia" },
    { lat: 40.4168, lng: -3.7038, intensity: 0.6, label: "Madrid - Arrestation" },
    { lat: 51.5074, lng: -0.1278, intensity: 0.9, label: "Londres - Menace terroriste" },
    { lat: 59.3293, lng: 18.0686, intensity: 0.5, label: "Stockholm - Incidents" },
    { lat: 55.6761, lng: 12.5683, intensity: 0.4, label: "Copenhague - Alerte" },
    { lat: 48.1351, lng: 11.5820, intensity: 0.7, label: "Munich - Sécurité renforcée" },
    { lat: 43.2965, lng: 5.3698, intensity: 0.8, label: "Marseille - Trafic d'armes" },
    { lat: 50.4501, lng: 30.5234, intensity: 1.0, label: "Kiev - Zone de conflit" },
    { lat: 52.2297, lng: 21.0122, intensity: 0.7, label: "Varsovie - Exercices militaires" },
    { lat: 44.4268, lng: 26.1025, intensity: 0.6, label: "Bucarest - Déploiement NATO" },
  ];

  // Sample data for Radar Chart
  const radarSeries: RadarSeries[] = [
    {
      name: "Capacité Actuelle",
      color: "#3b82f6",
      data: [
        { subject: "Cyber", value: 85, fullMark: 100 },
        { subject: "Renseignement", value: 78, fullMark: 100 },
        { subject: "Défense", value: 92, fullMark: 100 },
        { subject: "Logistique", value: 70, fullMark: 100 },
        { subject: "Diplomatie", value: 88, fullMark: 100 },
        { subject: "Technologie", value: 82, fullMark: 100 },
      ]
    },
    {
      name: "Objectif 2025",
      color: "#10b981",
      data: [
        { subject: "Cyber", value: 95, fullMark: 100 },
        { subject: "Renseignement", value: 90, fullMark: 100 },
        { subject: "Défense", value: 95, fullMark: 100 },
        { subject: "Logistique", value: 85, fullMark: 100 },
        { subject: "Diplomatie", value: 92, fullMark: 100 },
        { subject: "Technologie", value: 98, fullMark: 100 },
      ]
    }
  ];

  // Sample data for Sankey Diagram
  const sankeyNodes = [
    { id: "news1", name: "Reuters", color: "#ef4444" },
    { id: "news2", name: "AFP", color: "#f59e0b" },
    { id: "news3", name: "BBC", color: "#10b981" },
    { id: "analyst1", name: "Analyste 1", color: "#3b82f6" },
    { id: "analyst2", name: "Analyste 2", color: "#6366f1" },
    { id: "report1", name: "Rapport Final", color: "#8b5cf6" },
  ];

  const sankeyLinks = [
    { source: "news1", target: "analyst1", value: 50 },
    { source: "news1", target: "analyst2", value: 30 },
    { source: "news2", target: "analyst1", value: 40 },
    { source: "news2", target: "analyst2", value: 45 },
    { source: "news3", target: "analyst1", value: 35 },
    { source: "news3", target: "analyst2", value: 40 },
    { source: "analyst1", target: "report1", value: 125 },
    { source: "analyst2", target: "report1", value: 115 },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Visualisations Avancées</h1>
        <p className="text-muted-foreground">
          Analyses multi-dimensionnelles pour une intelligence approfondie
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="heatmap" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="heatmap" className="flex items-center gap-2">
            <Thermometer className="w-4 h-4" />
            Carte de Chaleur
          </TabsTrigger>
          <TabsTrigger value="radar" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Radar
          </TabsTrigger>
          <TabsTrigger value="sankey" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            Flux
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
        </TabsList>

        {/* Heat Map Tab */}
        <TabsContent value="heatmap" className="mt-6 space-y-4">
          <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <h3 className="font-semibold text-orange-400 mb-2">🔥 Qu'est-ce qu'une carte de chaleur ?</h3>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Utilité:</strong> Identifie rapidement les zones à forte activité ou risque élevé.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Lecture:</strong> Bleu = faible intensité, Rouge = forte intensité. 
              Les zones chaudes indiquent une concentration d'événements.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Usage militaire:</strong> Cartographie des menaces, zones de conflit, concentration de forces,
              points chauds géopolitiques. Ajustez rayon/flou/intensité pour affiner l'analyse.
            </p>
          </div>
          <div className="h-[calc(100vh-350px)]">
            <HeatMapModule
              data={heatMapData}
              title="Événements de sécurité en Europe"
              description="15 événements majeurs - Rouge = Haute intensité, Bleu = Faible"
            />
          </div>
        </TabsContent>

        {/* Radar Chart Tab */}
        <TabsContent value="radar" className="mt-6 space-y-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="font-semibold text-blue-400 mb-2">📊 Qu'est-ce qu'un graphique radar ?</h3>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Utilité:</strong> Compare plusieurs dimensions simultanément pour identifier forces et faiblesses.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Lecture:</strong> Plus la zone est grande, meilleures sont les capacités. 
              Comparez visuellement "Actuel" (bleu) vs "Objectif" (vert) pour voir les gaps.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Usage militaire:</strong> Évaluation SWOT, analyse de capacités, comparaison de forces adverses.
            </p>
          </div>
          <div className="h-[calc(100vh-350px)]">
            <RadarChartModule
              series={radarSeries}
              title="Analyse des capacités militaires"
              description="Comparaison multi-dimensionnelle des capacités actuelles vs objectifs 2025"
            />
          </div>
        </TabsContent>

        {/* Sankey Diagram Tab */}
        <TabsContent value="sankey" className="mt-6 space-y-4">
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <h3 className="font-semibold text-purple-400 mb-2">🌊 Qu'est-ce qu'un diagramme de flux (Sankey) ?</h3>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Utilité:</strong> Visualise comment l'information circule de la source à la destination.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Lecture:</strong> L'épaisseur des liens = volume d'information. Suivez le chemin de gauche à droite.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Usage renseignement:</strong> Tracer la chaîne de transmission d'info, identifier les goulots d'étranglement,
              détecter les sources critiques, analyser les flux d'influence.
            </p>
          </div>
          <div className="h-[calc(100vh-380px)]">
            <SankeyDiagramModule
              nodes={sankeyNodes}
              links={sankeyLinks}
              title="Flux d'information du renseignement"
              description="Sources multiples → Analystes → Rapport final. Épaisseur = Volume d'info"
            />
          </div>
        </TabsContent>

        {/* All Visualizations */}
        <TabsContent value="all" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="h-[500px]">
              <HeatMapModule
                data={heatMapData}
                title="Carte de Chaleur"
              />
            </div>
            <div className="h-[500px]">
              <RadarChartModule
                series={radarSeries}
                title="Analyse Radar"
              />
            </div>
          </div>
          <div className="h-[500px]">
            <SankeyDiagramModule
              nodes={sankeyNodes}
              links={sankeyLinks}
              title="Flux d'Information"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

