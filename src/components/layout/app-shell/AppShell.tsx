import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useSiteAssets } from '@/hooks/useSiteAssets';
import { cn } from '@/lib/utils';

import { AppShellNav } from './AppShellNav';
import {
  type AppNavEntry,
  findActiveLabel,
  findGroupIdForSection,
  isNavGroup,
} from './types';

const COLLAPSE_STORAGE_KEY = 'app-shell:collapsed';

const ROLE_BADGE: Record<string, string> = {
  SuperUser: 'bg-violet-100 text-violet-700 border-violet-200',
  Admin: 'bg-violet-100 text-violet-700 border-violet-200',
  Accounting: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Booker: 'bg-sky-100 text-sky-700 border-sky-200',
  Driver: 'bg-amber-100 text-amber-700 border-amber-200',
  StoreStaff: 'bg-rose-100 text-rose-700 border-rose-200',
  Customer: 'bg-slate-100 text-slate-700 border-slate-200',
};

const ROLE_LABEL: Record<string, string> = {
  StoreStaff: 'Store Staff',
  SuperUser: 'Super User',
};

export interface AppShellProps {
  /** Product-area name shown by the logo, e.g. "Admin Panel", "Booker Workspace". */
  panelName: string;
  nav: AppNavEntry[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  /** Rendered in the sidebar/mobile header, e.g. a <NotificationBell />. */
  headerAccessory?: React.ReactNode;
  /** Optional page header shown above the content on every breakpoint. */
  pageTitle?: string;
  pageDescription?: string;
  pageActions?: React.ReactNode;
  /**
   * Override the content wrapper. Defaults to a centred, max-width column
   * suited to focused workspaces. Data-dense dashboards can pass a full-width
   * class (e.g. "w-full px-4 py-6 sm:px-6") instead.
   */
  contentClassName?: string;
  children: React.ReactNode;
}

const useDefaultGroupState = (nav: AppNavEntry[], activeSection: string) =>
  useMemo(() => {
    const activeGroup = findGroupIdForSection(nav, activeSection);
    return nav.reduce<Record<string, boolean>>((state, entry, index) => {
      if (isNavGroup(entry)) {
        state[entry.id] = entry.id === activeGroup || index === 0;
      }
      return state;
    }, {});
  }, [nav, activeSection]);

const UserIdentity = ({
  name,
  role,
  compact = false,
}: {
  name?: string | null;
  role?: string | null;
  compact?: boolean;
}) => (
  <div className="min-w-0">
    <p className={cn('truncate font-medium text-sidebar-foreground', compact ? 'text-sm' : 'text-sm')}>
      {name || 'Signed in'}
    </p>
    {role && (
      <Badge
        variant="outline"
        className={cn('mt-1 h-5 px-2 text-[11px] font-medium', ROLE_BADGE[role] ?? ROLE_BADGE.Customer)}
      >
        {ROLE_LABEL[role] ?? role}
      </Badge>
    )}
  </div>
);

export const AppShell = ({
  panelName,
  nav,
  activeSection,
  onSectionChange,
  headerAccessory,
  pageTitle,
  pageDescription,
  pageActions,
  contentClassName,
  children,
}: AppShellProps) => {
  const { profile, signOut } = useAuth();
  const { assets } = useSiteAssets();
  const navigate = useNavigate();

  const defaultGroups = useDefaultGroupState(nav, activeSection);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(defaultGroups);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
  });

  // Keep the group containing the active section open as it changes.
  useEffect(() => {
    const activeGroup = findGroupIdForSection(nav, activeSection);
    if (activeGroup) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup]: true }));
    }
  }, [nav, activeSection]);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      }
      return next;
    });
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [navigate, signOut]);

  const activeLabel = findActiveLabel(nav, activeSection) ?? panelName;

  const handleDesktopSelect = useCallback(
    (id: string) => {
      if (collapsed) setCollapsed(false);
      onSectionChange(id);
    },
    [collapsed, onSectionChange],
  );

  const handleMobileSelect = useCallback(
    (id: string) => {
      onSectionChange(id);
      setMobileOpen(false);
    },
    [onSectionChange],
  );

  const logo = assets.logo || '/placeholder.svg';

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-muted/30">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur lg:flex',
          collapsed ? 'w-[76px]' : 'w-72',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-3 border-b border-sidebar-border/70 px-4 py-4',
            collapsed && 'justify-center px-2',
          )}
        >
          <img src={logo} alt="Travel Light Aruba" className="h-8 w-auto shrink-0 object-contain" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">{panelName}</p>
            </div>
          )}
          {!collapsed && headerAccessory}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <AppShellNav
            entries={nav}
            activeSection={activeSection}
            onSelect={handleDesktopSelect}
            openGroups={openGroups}
            onToggleGroup={toggleGroup}
            collapsed={collapsed}
          />
        </nav>

        <div className={cn('space-y-2 border-t border-sidebar-border/70 p-3', collapsed && 'px-2')}>
          {!collapsed && <UserIdentity name={profile?.name} role={profile?.role} />}
          <div className={cn('flex gap-2', collapsed ? 'flex-col items-center' : 'items-center')}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </Button>
            {!collapsed && (
              <Button variant="outline" className="flex-1 gap-2" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            )}
            {collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                aria-label="Sign out"
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-[86vw] max-w-[320px] flex-col p-0">
                {/* pr-12 leaves room for the sheet's built-in close button */}
                <div className="flex items-center gap-3 border-b border-border/60 py-4 pl-5 pr-12">
                  <img src={logo} alt="Travel Light Aruba" className="h-8 w-auto shrink-0 object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{panelName}</p>
                  </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4">
                  <AppShellNav
                    entries={nav}
                    activeSection={activeSection}
                    onSelect={handleMobileSelect}
                    openGroups={openGroups}
                    onToggleGroup={toggleGroup}
                  />
                </nav>

                <div className="space-y-3 border-t border-border/60 p-4">
                  <UserIdentity name={profile?.name} role={profile?.role} />
                  <Button variant="outline" className="w-full gap-2" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{panelName}</p>
              <p className="truncate text-sm font-semibold text-foreground">{activeLabel}</p>
            </div>
          </div>
          {headerAccessory}
        </header>

        <main className="min-w-0 flex-1 h-screen overflow-y-auto">
          {(pageTitle || pageActions) && (
            <div className="border-b border-border/60 bg-background/60">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                <div className="min-w-0 space-y-1">
                  {pageTitle && (
                    <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
                      {pageTitle}
                    </h1>
                  )}
                  {pageDescription && (
                    <p className="text-sm text-muted-foreground">{pageDescription}</p>
                  )}
                </div>
                {pageActions && <div className="flex shrink-0 items-center gap-2">{pageActions}</div>}
              </div>
            </div>
          )}
          <div className={cn('mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8', contentClassName)}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
