import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface SettingsDialogProps {
  selectedApi: 'gnews' | 'newsapi';
  onApiChange: (api: 'gnews' | 'newsapi') => void;
}

const SettingsDialog = ({ selectedApi, onApiChange }: SettingsDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempApi, setTempApi] = useState<'gnews' | 'newsapi'>(selectedApi);

  const handleSave = () => {
    onApiChange(tempApi);
    setIsOpen(false);
    toast.success("Paramètres sauvegardés");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-primary/30 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary">Paramètres</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configurez vos préférences de recherche
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              API de recherche
            </label>
            <Select value={tempApi} onValueChange={(value: 'gnews' | 'newsapi') => setTempApi(value)}>
              <SelectTrigger className="bg-card/50 border-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gnews">GNews API</SelectItem>
                <SelectItem value="newsapi">NewsAPI</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Choisissez l'API à utiliser pour les recherches d'articles
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave} className="hud-button">
              Sauvegarder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
