import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
}

/**
 * useKeyboardShortcuts - Global keyboard shortcuts
 * Provides keyboard navigation throughout AMBOS
 */
export function useKeyboardShortcuts(customShortcuts?: KeyboardShortcut[]) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check custom shortcuts first
      if (customShortcuts) {
        for (const shortcut of customShortcuts) {
          if (
            e.key.toLowerCase() === shortcut.key.toLowerCase() &&
            (shortcut.ctrl === undefined || e.ctrlKey === shortcut.ctrl) &&
            (shortcut.alt === undefined || e.altKey === shortcut.alt) &&
            (shortcut.shift === undefined || e.shiftKey === shortcut.shift) &&
            (shortcut.meta === undefined || e.metaKey === shortcut.meta)
          ) {
            e.preventDefault();
            shortcut.action();
            return;
          }
        }
      }

      // Global shortcuts
      // Cmd/Ctrl + K is handled by CommandPalette itself
      
      // Alt + H: Home
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        navigate('/');
        toast.info('Navigation: Accueil');
      }

      // Alt + V: Visualizations
      if (e.altKey && e.key === 'v') {
        e.preventDefault();
        navigate('/visualizations');
        toast.info('Navigation: Visualisations');
      }

      // Alt + A: Alerts
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        navigate('/alerts');
        toast.info('Navigation: Alertes');
      }

      // Alt + S: Source Credibility
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        navigate('/source-credibility');
        toast.info('Navigation: Sources');
      }

      // Alt + D: Admin (if admin)
      if (e.altKey && e.key === 'd') {
        e.preventDefault();
        navigate('/admin');
        toast.info('Navigation: Admin');
      }

      // Escape: Clear/Reset/Close
      if (e.key === 'Escape') {
        // Can be used by individual components to close modals, etc.
        // This is just a placeholder
      }

      // / : Focus search (when not in input)
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          toast.info('Recherche activée');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, customShortcuts]);
}

/**
 * List of all available keyboard shortcuts
 */
export const KEYBOARD_SHORTCUTS = [
  { keys: 'Cmd/Ctrl + K', description: 'Ouvrir la palette de commandes' },
  { keys: 'Alt + H', description: 'Accueil' },
  { keys: 'Alt + V', description: 'Visualisations' },
  { keys: 'Alt + A', description: 'Alertes' },
  { keys: 'Alt + S', description: 'Crédibilité des sources' },
  { keys: 'Alt + D', description: 'Admin' },
  { keys: '/', description: 'Activer la recherche' },
  { keys: 'Esc', description: 'Fermer les modales' },
  { keys: 'Ctrl + N', description: 'Nouvelle veille' },
  { keys: 'Ctrl + E', description: 'Exporter le rapport' },
  { keys: 'Ctrl + S', description: 'Sauvegarder le layout' },
];

export default useKeyboardShortcuts;

