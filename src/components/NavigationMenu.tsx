import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
  Home,
  BarChart3,
  Bell,
  Shield,
  Settings,
  BookmarkPlus,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Language } from '@/i18n/translations';

interface NavigationMenuProps {
  language?: Language;
}

export function AppNavigationMenu({ language = 'fr' }: NavigationMenuProps) {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { t } = useTranslation(language);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const menuItems = [
    {
      path: '/',
      label: 'Accueil',
      icon: Home,
      show: true,
    },
    {
      path: '/visualizations',
      label: 'Visualisations',
      icon: BarChart3,
      show: true,
    },
    {
      path: '/alerts',
      label: 'Alertes',
      icon: Bell,
      show: true,
    },
    {
      path: '/source-credibility',
      label: 'Sources',
      icon: Shield,
      show: true,
    },
    {
      path: '/admin',
      label: 'Admin',
      icon: Settings,
      show: isAdmin,
    },
  ];

  return (
    <NavigationMenu className="hidden md:block">
      <NavigationMenuList>
        {menuItems.filter(item => item.show).map((item) => {
          const Icon = item.icon;
          return (
            <NavigationMenuItem key={item.path}>
              <Link to={item.path}>
                <NavigationMenuLink 
                  className={cn(
                    navigationMenuTriggerStyle(),
                    isActive(item.path) && 'bg-primary text-primary-foreground'
                  )}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

// Mobile Navigation Menu (Dropdown)
export function MobileNavigationMenu({ language = 'fr' }: NavigationMenuProps) {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/', label: 'Accueil', icon: Home, show: true },
    { path: '/visualizations', label: 'Visualisations', icon: BarChart3, show: true },
    { path: '/alerts', label: 'Alertes', icon: Bell, show: true },
    { path: '/source-credibility', label: 'Sources', icon: Shield, show: true },
    { path: '/admin', label: 'Admin', icon: Settings, show: isAdmin },
  ];

  return (
    <div className="flex flex-col gap-1 w-full">
      {menuItems.filter(item => item.show).map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
              isActive(item.path)
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export default AppNavigationMenu;

