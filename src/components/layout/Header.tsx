
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useSiteAssets } from '@/hooks/useSiteAssets';
import { useCategories } from '@/hooks/useCategories';
import MobileNav from './MobileNav';
import { ShoppingCart } from 'lucide-react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '@/components/ui/navigation-menu';

export const Header = () => {
  const { user, profile, signOut, loading } = useAuth();
  const { items } = useCart();
  const { assets } = useSiteAssets();
  const { categories, loading: categoriesLoading } = useCategories();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/'); // Redirect to homepage after sign out
  };

  const getDashboardLink = () => {
    if (!profile) return null;

    switch (profile.role) {
      case 'Admin':
      case 'SuperUser':
        return { path: '/admin', label: 'Admin Dashboard' };
      case 'Driver':
        return { path: '/driver-dashboard', label: 'Driver Dashboard' };
      case 'Booker':
        return { path: '/customer-dashboard', label: 'My Dashboard' };
      default:
        return null;
    }
  };

  const dashboardLink = getDashboardLink();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <Link to="/" className="flex items-center">
            <img
              src={assets.logo || '/placeholder.svg'}
              alt="Travel Light Aruba"
              className="w-auto h-12 sm:h-16 object-contain"
              style={{ transform: 'scale(1.5)', transformOrigin: 'left center' }}
            />
          </Link>

          <nav className="hidden md:flex items-center space-x-6 text-sm">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-semibold text-muted-foreground hover:text-foreground">
                    Equipment
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="max-h-[60vh] overflow-y-auto">
                    <div className="grid gap-3 p-4 w-[520px]">
                      <NavigationMenuLink asChild>
                        <Link
                          to="/equipment"
                          className="block select-none space-y-1 rounded-xl border border-transparent p-3 leading-none no-underline outline-none transition-colors hover:border-border/60 hover:bg-accent/60 focus:border-border/60 focus:bg-accent/60"
                        >
                          <div className="text-sm font-semibold leading-none">All Equipment</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Browse our complete equipment catalog
                          </p>
                        </Link>
                      </NavigationMenuLink>

                      {!categoriesLoading && categories.map((category) => (
                        <div key={category.id} className="space-y-2">
                          <NavigationMenuLink asChild>
                            <Link
                              to={`/equipment?category=${encodeURIComponent(category.name)}`}
                              className="block select-none space-y-1 rounded-xl border border-transparent p-3 leading-none no-underline outline-none transition-colors hover:border-border/60 hover:bg-accent/60 focus:border-border/60 focus:bg-accent/60"
                            >
                              <div className="text-sm font-semibold leading-none">{category.name}</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                {category.description || `Browse all ${category.name.toLowerCase()}`}
                              </p>
                            </Link>
                          </NavigationMenuLink>

                          {category.sub_categories.length > 0 && (
                            <div className="ml-4 space-y-1">
                              {category.sub_categories.map((subCategory) => (
                                <NavigationMenuLink key={subCategory.id} asChild>
                                  <Link
                                    to={`/equipment?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(subCategory.name)}`}
                                    className="block select-none rounded-lg p-2 text-xs leading-none no-underline outline-none transition-colors hover:bg-accent/50 hover:text-foreground focus:bg-accent/50 focus:text-foreground text-muted-foreground"
                                  >
                                    {subCategory.name}
                                  </Link>
                                </NavigationMenuLink>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
            <Link to="/about" className="font-semibold text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/contact" className="font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link to="/cart" aria-label="Cart">
                <ShoppingCart className="h-5 w-5" />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold h-5 min-w-5 px-1 flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </Link>
            </Button>
            <Button asChild>
              <Link to="/book">Book Now</Link>
            </Button>
            {loading ? (
              <p>Loading...</p>
            ) : user && profile ? (
              <>
                {dashboardLink && (
                  <Button asChild variant="outline">
                    <Link to={dashboardLink.path}>{dashboardLink.label}</Link>
                  </Button>
                )}
                <Button variant="ghost" onClick={handleSignOut}>Logout</Button>
              </>
            ) : null}
          </div>

          <div className="md:hidden">
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  );
};
