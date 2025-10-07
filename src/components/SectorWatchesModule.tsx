import { useState, useEffect } from "react";
import { BookmarkPlus, Play, Edit, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SectorWatch {
  id: string;
  name: string;
  sector: string;
  query: string;
  query_en: string | null;
  query_it: string | null;
  language: string;
  api: string;
  description: string | null;
  color: string;
}

interface SectorWatchesModuleProps {
  onLaunchWatch: (watch: SectorWatch) => void;
}

const SectorWatchesModule = ({ onLaunchWatch }: SectorWatchesModuleProps) => {
  const [watches, setWatches] = useState<SectorWatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWatch, setEditingWatch] = useState<SectorWatch | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    sector: "",
    query: "",
    query_en: "",
    query_it: "",
    language: "fr",
    api: "newsapi",
    description: "",
    color: "#0ea5e9"
  });

  useEffect(() => {
    fetchWatches();
  }, []);

  const fetchWatches = async () => {
    try {
      const { data, error } = await supabase
        .from('sector_watches')
        .select('*')
        .order('sector', { ascending: true });

      if (error) throw error;
      setWatches(data || []);
    } catch (error: any) {
      console.error('Error fetching watches:', error);
      toast.error("Erreur lors du chargement des veilles");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWatch = async () => {
    if (!formData.name || !formData.sector || !formData.query) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      if (editingWatch) {
        const { error } = await supabase
          .from('sector_watches')
          .update(formData)
          .eq('id', editingWatch.id);

        if (error) throw error;
        toast.success("Veille mise à jour");
      } else {
        const { error } = await supabase
          .from('sector_watches')
          .insert([formData]);

        if (error) throw error;
        toast.success("Veille créée");
      }

      fetchWatches();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving watch:', error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleDeleteWatch = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sector_watches')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Veille supprimée");
      fetchWatches();
    } catch (error: any) {
      console.error('Error deleting watch:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const openEditDialog = (watch: SectorWatch) => {
    setEditingWatch(watch);
    setFormData({
      name: watch.name,
      sector: watch.sector,
      query: watch.query,
      query_en: watch.query_en || "",
      query_it: watch.query_it || "",
      language: watch.language,
      api: watch.api,
      description: watch.description || "",
      color: watch.color
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingWatch(null);
    setFormData({
      name: "",
      sector: "",
      query: "",
      query_en: "",
      query_it: "",
      language: "fr",
      api: "newsapi",
      description: "",
      color: "#0ea5e9"
    });
  };

  const sectorColors: Record<string, string> = {
    'Défense': 'bg-red-500/20 border-red-500/40 text-red-400',
    'Économie': 'bg-green-500/20 border-green-500/40 text-green-400',
    'Culture': 'bg-purple-500/20 border-purple-500/40 text-purple-400',
    'Sécurité': 'bg-orange-500/20 border-orange-500/40 text-orange-400',
    'Diplomatie': 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400',
  };

  return (
    <div className="hud-panel h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
          <BookmarkPlus className="w-4 h-4" />
          VEILLES SECTORIELLES
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Nouvelle
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-primary/30">
            <DialogHeader>
              <DialogTitle className="text-primary">
                {editingWatch ? "Modifier la veille" : "Nouvelle veille sectorielle"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nom de la veille *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Défense France-Italie"
                  className="bg-card/50 border-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Secteur *</label>
                <Input
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  placeholder="Ex: Défense, Économie, Culture..."
                  className="bg-card/50 border-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Requête FR *</label>
                <Textarea
                  value={formData.query}
                  onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                  placeholder="Ex: défense France Italie OR militaire France Italie"
                  className="bg-card/50 border-primary/30"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Requête EN</label>
                <Textarea
                  value={formData.query_en}
                  onChange={(e) => setFormData({ ...formData, query_en: e.target.value })}
                  placeholder="Ex: defense France Italy OR military France Italy"
                  className="bg-card/50 border-primary/30"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Requête IT</label>
                <Textarea
                  value={formData.query_it}
                  onChange={(e) => setFormData({ ...formData, query_it: e.target.value })}
                  placeholder="Ex: difesa Francia Italia OR militare Francia Italia"
                  className="bg-card/50 border-primary/30"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description de la veille..."
                  className="bg-card/50 border-primary/30"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Langue</label>
                  <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                    <SelectTrigger className="bg-card/50 border-primary/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="it">Italiano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">API</label>
                  <Select value={formData.api} onValueChange={(value) => setFormData({ ...formData, api: value })}>
                    <SelectTrigger className="bg-card/50 border-primary/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gnews">GNews</SelectItem>
                      <SelectItem value="newsapi">NewsAPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSaveWatch} className="hud-button">
                  {editingWatch ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            Chargement...
          </div>
        ) : watches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
            <BookmarkPlus className="w-8 h-8 mb-2 opacity-50" />
            <p>Aucune veille sectorielle</p>
            <p className="text-xs">Créez votre première veille</p>
          </div>
        ) : (
          watches.map((watch) => (
            <div
              key={watch.id}
              className="p-3 bg-card/30 border border-primary/20 rounded hover:border-primary/40 transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {watch.name}
                    </h3>
                    <span 
                      className={`text-[10px] px-2 py-0.5 rounded border ${sectorColors[watch.sector] || 'bg-primary/20 border-primary/40 text-primary'}`}
                    >
                      {watch.sector}
                    </span>
                  </div>
                  {watch.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {watch.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/70 font-mono">
                    {watch.query}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="uppercase">{watch.language}</span>
                  <span>•</span>
                  <span className="uppercase">{watch.api}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLaunchWatch(watch)}
                    className="h-7 px-2 text-xs hud-button"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Lancer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(watch)}
                    className="h-7 px-2 text-xs"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteWatch(watch.id)}
                    className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SectorWatchesModule;
