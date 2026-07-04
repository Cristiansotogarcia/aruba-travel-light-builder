import { useEffect, useState } from 'react';
import { CreditCard, FileText, LayoutDashboard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSiteAssets } from '@/hooks/useSiteAssets';

interface AccountingSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const menuItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: CreditCard },
  { id: 'invoices', label: 'Invoices', icon: FileText },
];

export const AccountingSidebar = ({ activeSection, onSectionChange }: AccountingSidebarProps) => {
  const { profile, signOut } = useAuth();
  const { assets } = useSiteAssets();
  const [currentSection, setCurrentSection] = useState(activeSection || 'overview');

  const handleSectionChange = (section: string) => {
    setCurrentSection(section);
    onSectionChange?.(section);
  };

  useEffect(() => {
    setCurrentSection(activeSection || 'overview');
  }, [activeSection]);

  return (
    <div className="w-64 bg-background/90 border-r border-border/60 flex flex-col h-screen backdrop-blur">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <img
            src={assets.logo || '/placeholder.svg'}
            alt="Travel Light Aruba"
            className="h-8 w-auto mr-3"
            style={{ transform: 'scale(3)', transformOrigin: 'left center' }}
          />
          <h2 className="text-xl font-semibold text-foreground">Accounting</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {profile?.name} ({profile?.role})
        </p>
      </div>

      <nav className="px-4 pb-4 space-y-2 flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                currentSection === item.id
                  ? 'bg-accent/60 text-foreground border border-border/60'
                  : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/60">
        <Button onClick={signOut} variant="outline" className="w-full">
          Sign Out
        </Button>
      </div>
    </div>
  );
};
