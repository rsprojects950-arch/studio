'use client';

import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/theme-context';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Moon, Sun } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function DashboardHeader() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const getPageTitle = () => {
    const segment = pathname.split('/').pop();
    switch (segment) {
      case 'dashboard':
        return 'Dashboard';
      case 'todos':
        return 'To-Do List';
      case 'goals':
        return 'Short Term Goals';
      case 'notes':
        return 'Notes';
      case 'resources':
        return 'Resources';
      case 'chat':
        return 'Public Chat';
      case 'bt-bot':
        return 'BT-bot';
      case 'profile':
        return 'User Profile';
      default:
        return 'Beyond Theory';
    }
  };

  return (
    <header className="p-4 flex items-center justify-between gap-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="flex items-center gap-2 md:hidden" />
        <h1 className="font-semibold text-lg hidden md:block">{getPageTitle()}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Sun className="h-5 w-5" />
        <Switch
          id="dark-mode-toggle"
          checked={theme === 'dark'}
          onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          aria-label="Toggle dark mode"
        />
        <Moon className="h-5 w-5" />
      </div>
    </header>
  );
}
