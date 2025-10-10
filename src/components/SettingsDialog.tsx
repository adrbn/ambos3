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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";

interface SettingsDialogProps {
  selectedApi: 'gnews' | 'newsapi' | 'mediastack' | 'mixed';
  onApiChange: (api: 'gnews' | 'newsapi' | 'mediastack' | 'mixed') => void;
  language: Language;
  enableQueryEnrichment: boolean;
  onEnableQueryEnrichmentChange: (enabled: boolean) => void;
  theme: 'default' | 'light' | 'girly';
  onThemeChange: (theme: 'default' | 'light' | 'girly') => void;
}

const SettingsDialog = ({ selectedApi, onApiChange, language, enableQueryEnrichment, onEnableQueryEnrichmentChange, theme, onThemeChange }: SettingsDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempApi, setTempApi] = useState<'gnews' | 'newsapi' | 'mediastack' | 'mixed'>(selectedApi);
  const [tempEnrichment, setTempEnrichment] = useState(enableQueryEnrichment);
  const [tempTheme, setTempTheme] = useState<'default' | 'light' | 'girly'>(theme);
  const { t } = useTranslation(language);

  const handleSave = () => {
    onApiChange(tempApi);
    onEnableQueryEnrichmentChange(tempEnrichment);
    onThemeChange(tempTheme);
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
              onValueChange={(value: 'gnews' | 'newsapi' | 'mediastack' | 'mixed') => setTempApi(value)}
            >
              <SelectTrigger className="bg-card/50 border-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gnews">GNews API</SelectItem>
                <SelectItem value="newsapi">NewsAPI</SelectItem>
                <SelectItem value="mediastack">Mediastack API</SelectItem>
                <SelectItem value="mixed">🔀 Mixte (toutes les APIs)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              {t('searchApiDescription')}
            </p>
          </div>

          <Separator className="my-4" />

          <Separator className="my-4" />

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Thème
            </label>
            <Select 
              value={tempTheme} 
              onValueChange={(value: 'default' | 'light' | 'girly') => setTempTheme(value)}
            >
              <SelectTrigger className="bg-card/50 border-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">🛡️ Défaut (AMBOS)</SelectItem>
                <SelectItem value="light">☀️ Clair (Minimaliste)</SelectItem>
                <SelectItem value="girly">💖 Girly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-4" />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">⚙️ Menu développeur</h3>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground">
                  Enrichissement des requêtes
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Active l'optimisation automatique des requêtes via IA (opérateurs booléens pour news, hashtags pour OSINT)
                </p>
              </div>
              <Switch
                checked={tempEnrichment}
                onCheckedChange={setTempEnrichment}
                className="ml-3"
              />
            </div>
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
