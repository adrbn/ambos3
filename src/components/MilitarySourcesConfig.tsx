import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MilitarySource {
  name: string;
  url: string;
  language: string;
  enabled: boolean;
}

interface MilitarySourcesConfigProps {
  sources: MilitarySource[];
  onSourcesChange: (sources: MilitarySource[]) => void;
}

export const MilitarySourcesConfig = ({ sources, onSourcesChange }: MilitarySourcesConfigProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '', language: 'it' });

  const handleToggleSource = (index: number) => {
    const updated = [...sources];
    updated[index].enabled = !updated[index].enabled;
    onSourcesChange(updated);
  };

  const handleAddSource = () => {
    if (!newSource.name || !newSource.url) {
      toast.error("Nom et URL sont requis");
      return;
    }

    if (!newSource.url.startsWith('http')) {
      toast.error("URL invalide (doit commencer par http:// ou https://)");
      return;
    }

    const sourceToAdd: MilitarySource = {
      name: newSource.name,
      url: newSource.url,
      language: newSource.language || 'it',
      enabled: true
    };

    onSourcesChange([...sources, sourceToAdd]);
    setNewSource({ name: '', url: '', language: 'it' });
    setIsAddDialogOpen(false);
    toast.success(`Source "${sourceToAdd.name}" ajoutée`);
  };

  const handleRemoveSource = (index: number) => {
    const updated = sources.filter((_, i) => i !== index);
    onSourcesChange(updated);
    toast.success("Source supprimée");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground font-mono">Flux RSS militaires actifs:</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <button className="px-2 py-1 rounded bg-primary/20 hover:bg-primary/30 transition-all border border-primary/30">
              <Plus className="w-3 h-3 text-primary" />
            </button>
          </DialogTrigger>
          <DialogContent className="bg-card border-primary/30">
            <DialogHeader>
              <DialogTitle className="text-sm font-mono">Ajouter un flux RSS</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="name" className="text-xs">Nom de la source</Label>
                <Input
                  id="name"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  placeholder="Ex: Defense News Italia"
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label htmlFor="url" className="text-xs">URL du flux RSS</Label>
                <Input
                  id="url"
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  placeholder="https://example.com/feed/"
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label htmlFor="language" className="text-xs">Langue (ISO 639-1)</Label>
                <Input
                  id="language"
                  value={newSource.language}
                  onChange={(e) => setNewSource({ ...newSource, language: e.target.value })}
                  placeholder="it"
                  maxLength={2}
                  className="text-xs mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Ex: it, en, fr</p>
              </div>
              <Button onClick={handleAddSource} className="w-full text-xs">
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {sources.map((source, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-3 py-2 rounded bg-card/30 border border-primary/20 hover:bg-card/50 transition-all"
          >
            <input
              type="checkbox"
              checked={source.enabled}
              onChange={() => handleToggleSource(index)}
              className="w-3 h-3"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-mono block truncate">
                {source.name}
              </span>
              <span className="text-[10px] text-muted-foreground block truncate">
                {source.url}
              </span>
            </div>
            <button
              onClick={() => handleRemoveSource(index)}
              className="p-1 hover:bg-destructive/20 rounded transition-all"
              title="Supprimer"
            >
              <X className="w-3 h-3 text-destructive" />
            </button>
          </div>
        ))}
      </div>
      
      <p className="text-[10px] text-muted-foreground/70 mt-2">
        💡 Flux RSS italiens spécialisés défense/armement
      </p>
    </div>
  );
};
