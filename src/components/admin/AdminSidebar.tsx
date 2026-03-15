import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import {
  ADMIN_DASHBOARD_ITEM,
  getAdminGroupIdForSection,
  getDefaultAdminGroupState,
  getVisibleAdminNavigation,
} from './adminNavigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSiteAssets } from '@/hooks/useSiteAssets';
import { NotificationBell } from './NotificationBell';

interface AdminSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export const AdminSidebar = ({ activeSection, onSectionChange }: AdminSidebarProps) => {
  const { profile, hasPermission, signOut } = useAuth();
  const { assets } = useSiteAssets();
  const [currentSection, setCurrentSection] = useState(activeSection || 'dashboard');
  const [openGroups, setOpenGroups] = useState(() =>
    getDefaultAdminGroupState(activeSection || ADMIN_DASHBOARD_ITEM.id)
  );

  const { dashboard, groups } = useMemo(
    () => getVisibleAdminNavigation(hasPermission),
    [hasPermission]
  );
  const DashboardIcon = dashboard.icon;

  const handleSectionChange = (section: string) => {
    setCurrentSection(section);
    onSectionChange?.(section);
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups((currentGroups) => ({
      ...currentGroups,
      [groupId]: !currentGroups[groupId],
    }));
  };

  useEffect(() => {
    const nextSection = activeSection || ADMIN_DASHBOARD_ITEM.id;
    setCurrentSection(nextSection);

    const activeGroupId = getAdminGroupIdForSection(nextSection);
    if (activeGroupId) {
      setOpenGroups((currentGroups) => ({
        ...currentGroups,
        [activeGroupId]: true,
      }));
    }
  }, [activeSection]);

  return (
    <aside className="hidden lg:flex w-72 bg-background/80 border-r border-border/60 flex-col h-screen backdrop-blur">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <img
              src={assets.logo || '/placeholder.svg'}
              alt="Travel Light Aruba"
              className="h-8 w-auto mr-3"
              style={{ transform: 'scale(3)', transformOrigin: 'left center' }}
            />
            <h2 className="text-xl font-semibold text-foreground">Admin Panel</h2>
          </div>
          <NotificationBell />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {profile?.name} ({profile?.role})
        </p>
      </div>

      <nav className="px-4 pb-4 flex-1 overflow-y-auto">
        <div className="space-y-3">
          <button
            onClick={() => handleSectionChange(dashboard.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              currentSection === dashboard.id
                ? 'bg-accent/60 text-foreground border border-border/60'
                : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
            }`}
          >
            <DashboardIcon className="h-5 w-5" />
            <span className="font-medium">{dashboard.label}</span>
          </button>

          {groups.map((group) => {
            const isGroupActive = group.items.some((item) => item.id === currentSection);
            const GroupIcon = group.icon;

            return (
              <Collapsible
                key={group.id}
                open={openGroups[group.id]}
                onOpenChange={() => toggleGroup(group.id)}
              >
                <div className="rounded-2xl border border-border/60 bg-background/50 overflow-hidden">
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/30">
                    <div className="flex items-center gap-3">
                      <GroupIcon className={`h-5 w-5 ${isGroupActive ? 'text-foreground' : 'text-muted-foreground'}`} />
                      <p className={`text-sm font-semibold ${isGroupActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {group.label}
                      </p>
                    </div>
                    {openGroups[group.id] ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-1">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;

                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSectionChange(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                              currentSection === item.id
                                ? 'bg-accent/60 text-foreground border border-border/60'
                                : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                            }`}
                          >
                            <ItemIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-border/60">
        <Button 
          onClick={signOut} 
          variant="outline" 
          className="w-full"
        >
          Sign Out
        </Button>
      </div>
    </aside>
  );
};
