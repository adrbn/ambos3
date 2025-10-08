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
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";

// CORRECTION 1 : Mise à jour de l'interface pour accepter 'mediastack'
interface SettingsDialogProps {
  selectedApi: 'gnews' | 'newsapi' | 'mediastack';
  onApiChange: (api: 'gnews' | 'newsapi' | 'mediastack') => void;
  language: Language;
}

const SettingsDialog = ({ selectedApi, onApiChange, language }: SettingsDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // CORRECTION 2 : Mise à jour de l'état local pour accepter 'mediastack'
  const [tempApi, setTempApi] = useState<'gnews' | 'newsapi' | 'mediastack'>(selectedApi);
  const { t } = useTranslation(language);

  const handleSave = () => {
    onApiChange(tempApi);
    setIsOpen(false);
    toast.success(t('settingsSaved'));
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
          <DialogTitle className="text-primary">{t('settingsTitle')}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('settingsDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {t('searchApiLabel')}
            </label>
            <Select 
              value={tempApi} 
              // Le type de la valeur doit aussi être mis à jour ici
              onValueChange={(value: 'gnews' | 'newsapi' | 'mediastack') => setTempApi(value)}
            >
              <SelectTrigger className="bg-card/50 border-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gnews">GNews API</SelectItem>
                <SelectItem value="newsapi">NewsAPI</SelectItem>
                {/* CORRECTION 3 : Ajout de la nouvelle option visible */}
                <SelectItem value="mediastack">Mediastack API</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              {t('searchApiDescription')}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              {t('cancel')}
            </Button>
            <Button size="sm" onClick={handleSave} className="hud-button">
              {t('save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
