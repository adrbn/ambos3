import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LanguageSelectorProps {
  language: string;
  onLanguageChange: (lang: string) => void;
}

const LanguageSelector = ({ language, onLanguageChange }: LanguageSelectorProps) => {
  const languages = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'fr', label: 'FR', name: 'Français' },
    { code: 'it', label: 'IT', name: 'Italiano' },
  ];

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-primary" />
      <div className="flex gap-1">
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={language === lang.code ? "default" : "outline"}
            size="sm"
            onClick={() => onLanguageChange(lang.code)}
            className={`
              px-3 py-1 text-xs font-mono
              ${language === lang.code 
                ? 'bg-primary text-primary-foreground border-glow' 
                : 'bg-card/50 text-primary/70 hover:text-primary border-primary/30'
              }
            `}
            title={lang.name}
          >
            {lang.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;
