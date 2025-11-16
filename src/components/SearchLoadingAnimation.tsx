import { Card, CardContent } from '@/components/ui/card';
import { Shield, Zap, Search, Database, Brain, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';

interface SearchLoadingAnimationProps {
  language?: 'fr' | 'en' | 'it';
}

/**
 * SearchLoadingAnimation - Beautiful loading animation for search
 * Shows progress through different stages of intelligence gathering
 */
export function SearchLoadingAnimation({ language = 'fr' }: SearchLoadingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      icon: Search,
      label: {
        fr: 'Recherche multi-sources...',
        en: 'Multi-source search...',
        it: 'Ricerca multi-fonte...'
      },
      color: 'text-blue-500',
    },
    {
      icon: Database,
      label: {
        fr: 'Collecte de données...',
        en: 'Collecting data...',
        it: 'Raccolta dati...'
      },
      color: 'text-cyan-500',
    },
    {
      icon: Brain,
      label: {
        fr: 'Analyse IA en cours...',
        en: 'AI analysis in progress...',
        it: 'Analisi IA in corso...'
      },
      color: 'text-purple-500',
    },
    {
      icon: Zap,
      label: {
        fr: 'Extraction d\'entités...',
        en: 'Extracting entities...',
        it: 'Estrazione entità...'
      },
      color: 'text-yellow-500',
    },
    {
      icon: CheckCircle2,
      label: {
        fr: 'Finalisation...',
        en: 'Finalizing...',
        it: 'Finalizzazione...'
      },
      color: 'text-green-500',
    },
  ];

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 100);

    // Step animation
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) return prev;
        return prev + 1;
      });
    }, 1500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-8">
          {/* Icon Animation */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Shield className="w-16 h-16 text-primary animate-pulse" />
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 transition-all duration-500 ${
                    isActive ? 'scale-105' : 'scale-100 opacity-50'
                  }`}
                >
                  <div className={`${step.color} ${isActive ? 'animate-pulse' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isActive ? step.color : 'text-muted-foreground'}`}>
                      {step.label[language]}
                    </p>
                  </div>
                  {isCompleted && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {progress < 100 ? `${Math.round(progress)}%` : 'Presque terminé...'}
            </p>
          </div>

          {/* Tip */}
          <div className="mt-6 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-center text-muted-foreground">
              💡 <strong>Astuce:</strong> Appuyez sur <kbd className="px-2 py-1 bg-background rounded border">Cmd+K</kbd> pour ouvrir la palette de commandes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SearchLoadingAnimation;

