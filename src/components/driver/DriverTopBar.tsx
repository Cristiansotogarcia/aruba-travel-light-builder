import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Truck } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useSiteAssets } from '@/hooks/useSiteAssets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const DriverTopBar = () => {
  const { assets } = useSiteAssets();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/driver-dashboard" className="shrink-0">
            <img
              src={assets.logo || '/placeholder.svg'}
              alt="Travel Light Aruba"
              className="h-10 w-auto object-contain sm:h-12"
            />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">
                Driver Workspace
              </h1>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Driver
              </Badge>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {profile?.name ? `${profile.name}'s assigned deliveries and pickups` : 'Assigned deliveries and pickups'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground md:flex">
            <Truck className="h-4 w-4" />
            Operations
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
