import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Search,
  Bell,
  Shield,
  BarChart3,
  Settings,
  LogOut,
  Home,
  BookmarkPlus,
  Users,
  FileText,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CommandPaletteProps {
  onSearch?: (query: string) => void;
  onNavigate?: (path: string) => void;
}

/**
 * CommandPalette - Universal search and navigation (Cmd+K / Ctrl+K)
 * Provides quick access to all features and pages
 */
export function CommandPalette({ onSearch, onNavigate }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();

  // Toggle command palette with Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
    if (onNavigate) onNavigate(path);
  }, [navigate, onNavigate]);

  const handleSearch = useCallback((query: string) => {
    if (onSearch) {
      onSearch(query);
      setOpen(false);
      toast.info(`Recherche: ${query}`);
    }
  }, [onSearch]);

  const handleAction = useCallback((action: () => void) => {
    action();
    setOpen(false);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Tapez une commande ou recherchez..." />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleNavigate('/')}>
            <Home className="mr-2 h-4 w-4" />
            <span>Accueil / Dashboard</span>
            <span className="ml-auto text-xs text-muted-foreground">Alt+H</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('/visualizations')}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Visualisations Avancées</span>
            <span className="ml-auto text-xs text-muted-foreground">Alt+V</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('/alerts')}>
            <Bell className="mr-2 h-4 w-4" />
            <span>Gestion des Alertes</span>
            <span className="ml-auto text-xs text-muted-foreground">Alt+A</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('/source-credibility')}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Crédibilité des Sources</span>
            <span className="ml-auto text-xs text-muted-foreground">Alt+S</span>
          </CommandItem>
          {isAdmin && (
            <CommandItem onSelect={() => handleNavigate('/admin')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Administration</span>
              <span className="ml-auto text-xs text-muted-foreground">Alt+D</span>
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Actions */}
        <CommandGroup heading="Actions Rapides">
          <CommandItem onSelect={() => handleSearch('cyber attack')}>
            <Search className="mr-2 h-4 w-4" />
            <span>Rechercher: Cyber Attack</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSearch('defense France')}>
            <Search className="mr-2 h-4 w-4" />
            <span>Rechercher: Défense France</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSearch('military intelligence')}>
            <Search className="mr-2 h-4 w-4" />
            <span>Rechercher: Renseignement Militaire</span>
          </CommandItem>
          <CommandItem onSelect={() => toast.info('Création de veille...')}>
            <BookmarkPlus className="mr-2 h-4 w-4" />
            <span>Créer une Veille Sectorielle</span>
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+N</span>
          </CommandItem>
          <CommandItem onSelect={() => toast.info('Génération de rapport...')}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Générer un Rapport</span>
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+E</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Settings */}
        <CommandGroup heading="Paramètres">
          <CommandItem onSelect={() => toast.info('Paramètres ouverts')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Ouvrir les Paramètres</span>
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+,</span>
          </CommandItem>
          <CommandItem onSelect={() => handleAction(signOut)}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Déconnexion</span>
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+Q</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Help */}
        <CommandGroup heading="Aide">
          <CommandItem>
            <Activity className="mr-2 h-4 w-4" />
            <span>Version 2.0 - Production Ready</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;

