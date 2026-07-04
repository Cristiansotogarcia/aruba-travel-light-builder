import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Menu, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useSiteAssets } from '@/hooks/useSiteAssets';
import {
  ADMIN_DASHBOARD_ITEM,
  getAdminGroupIdForSection,
  getAdminSectionLabel,
  getDefaultAdminGroupState,
  getVisibleAdminNavigation,
} from './adminNavigation';

interface AdminMobileNavProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export const AdminMobileNav = ({ activeSection, onSectionChange }: AdminMobileNavProps) => {
  const { profile, hasPermission, signOut } = useAuth();
  const { assets } = useSiteAssets();
  const [isOpen, setIsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(() =>
    getDefaultAdminGroupState(activeSection || ADMIN_DASHBOARD_ITEM.id)
  );

  const { dashboard, groups } = useMemo(
    () => getVisibleAdminNavigation(hasPermission),
    [hasPermission]
  );
  const DashboardIcon = dashboard.icon;

  const activeSectionId = activeSection || ADMIN_DASHBOARD_ITEM.id;
  const activeLabel = getAdminSectionLabel(activeSectionId);

  useEffect(() => {
    const activeGroupId = getAdminGroupIdForSection(activeSectionId);
    if (activeGroupId) {
      setOpenGroups((currentGroups) => ({
        ...currentGroups,
        [activeGroupId]: true,
      }));
    }
  }, [activeSectionId]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((currentGroups) => ({
      ...currentGroups,
      [groupId]: !currentGroups[groupId],
    }));
  };

  const handleSectionSelect = (section: string) => {
    onSectionChange?.(section);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  return (
    <div className="lg:hidden sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Admin Panel</p>
          <p className="text-sm font-semibold text-foreground truncate">{activeLabel}</p>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open admin menu</span>
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-[320px] p-0 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div className="flex items-center gap-3">
                <img
                  src={assets.logo || '/placeholder.svg'}
                  alt="Travel Light Aruba"
                  className="h-8 w-auto"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">Admin Menu</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.name} ({profile?.role})
                  </p>
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5" />
                <span className="sr-only">Close admin menu</span>
              </Button>
            </div>

            <div className="px-4 py-4 space-y-3">
              <button
                onClick={() => handleSectionSelect(dashboard.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  activeSectionId === dashboard.id
                    ? 'bg-accent/60 text-foreground border border-border/60'
                    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                }`}
              >
                <DashboardIcon className="h-5 w-5" />
                <span className="font-medium">{dashboard.label}</span>
              </button>

              {groups.map((group) => {
                const isGroupActive = group.items.some((item) => item.id === activeSectionId);
                const GroupIcon = group.icon;

                return (
                  <Collapsible
                    key={group.id}
                    open={openGroups[group.id]}
                    onOpenChange={() => toggleGroup(group.id)}
                  >
                    <div className="rounded-2xl border border-border/60 bg-background/60 overflow-hidden">
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
                                onClick={() => handleSectionSelect(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                                  activeSectionId === item.id
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

            <div className="border-t border-border/60 p-4">
              <Button variant="outline" className="w-full" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
