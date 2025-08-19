
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSiteAssets } from '@/hooks/useSiteAssets';
import { useCategories } from '@/hooks/useCategories';
import MobileNav from './MobileNav';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '@/components/ui/navigation-menu';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

export const Header = () => {
  const { user, profile, signOut, loading } = useAuth();
  const { assets } = useSiteAssets();
  const { categories, loading: categoriesLoading } = useCategories();
  const navigate = useNavigate();
  const { items } = useCart();

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
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center">
            <img
              src={assets.logo || '/placeholder.svg'}
              alt="Travel Light Aruba"
              className="w-auto h-20 object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Equipment</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-4 w-[500px]">
                      <NavigationMenuLink asChild>
                        <Link 
                          to="/equipment" 
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">All Equipment</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">Browse our complete equipment catalog</p>
                        </Link>
                      </NavigationMenuLink>
                      
                      {!categoriesLoading && categories.map((category) => (
                        <div key={category.id} className="space-y-2">
                          <NavigationMenuLink asChild>
                            <Link 
                              to={`/equipment?category=${encodeURIComponent(category.name)}`}
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="text-sm font-medium leading-none">{category.name}</div>
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
                                    className="block select-none rounded-md p-2 text-xs leading-none no-underline outline-none transition-colors hover:bg-accent/50 hover:text-accent-foreground focus:bg-accent/50 focus:text-accent-foreground text-muted-foreground"
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
            <Link to="/about" className="text-gray-700 hover:text-blue-600 transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-gray-700 hover:text-blue-600 transition-colors">
              Contact
            </Link>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <Link to="/cart" className="relative">
              <ShoppingCart className="h-6 w-6" />
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </Link>
            {loading ? (
              <p>Loading...</p>
            ) : user && profile ? (
              <>
                {(profile.role === 'Booker' || profile.role === 'Customer') && (
                  <Button asChild>
                    <Link to="/book">Book Now</Link>
                  </Button>
                )}
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
