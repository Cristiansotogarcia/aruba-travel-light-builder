import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useCategories } from '@/hooks/useCategories';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [categoryStates, setCategoryStates] = useState<Record<string, boolean>>({});
  const { user, profile, signOut, loading } = useAuth();
  const { items } = useCart();
  const { categories, loading: categoriesLoading } = useCategories();
  const navigate = useNavigate();

  const toggleCategory = (categoryId: string) => {
    setCategoryStates(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    navigate('/');
  };

  const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link
      to={to}
      onClick={() => setIsOpen(false)}
      className="block rounded-xl px-4 py-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-accent/60 hover:text-foreground"
    >
      {children}
    </Link>
  );

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
  const cartLabel = items.length > 0 ? `Cart (${items.length})` : 'Cart';

  useEffect(() => {
    if (isOpen || typeof document === "undefined") return;
    const cleanupStyle = (element: HTMLElement) => {
      element.style.removeProperty("overflow");
      element.style.removeProperty("padding-right");
      element.style.removeProperty("position");
      element.style.removeProperty("top");
      element.style.removeProperty("left");
      element.style.removeProperty("right");
      element.style.removeProperty("width");
      element.style.removeProperty("height");
      element.style.removeProperty("touch-action");
      element.style.removeProperty("transform");
    };

    cleanupStyle(document.body);
    cleanupStyle(document.documentElement);
    document.body.removeAttribute("data-scroll-locked");
    document.documentElement.removeAttribute("data-scroll-locked");
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="max-h-[100vh] overflow-y-auto p-0">
        <div className="flex justify-between items-center px-5 py-4 border-b border-border/60">
          <h2 className="text-lg font-semibold">Menu</h2>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-6 w-6" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>
        <nav className="px-4 py-4 space-y-2">
          <NavLink to="/book">Book Now</NavLink>
          <NavLink to="/cart">{cartLabel}</NavLink>
          <Collapsible open={equipmentOpen} onOpenChange={setEquipmentOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-accent/60 hover:text-foreground">
              <span>Equipment</span>
              {equipmentOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-4 border-l border-border/60 ml-3 mt-2 space-y-1">
                <NavLink to="/equipment">All Equipment</NavLink>
                
                {!categoriesLoading && categories.map((category) => (
                  <div key={category.id} className="space-y-1">
                    {category.sub_categories.length > 0 ? (
                      <Collapsible 
                        open={categoryStates[category.id] || false} 
                        onOpenChange={() => toggleCategory(category.id)}
                      >
                        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-accent/50 hover:text-foreground">
                          <span>{category.name}</span>
                          {categoryStates[category.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pl-4 border-l border-border/60 ml-2 mt-1 space-y-1">
                            <Link
                              to={`/equipment?category=${encodeURIComponent(category.name)}`}
                              onClick={() => setIsOpen(false)}
                              className="block rounded-lg px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                            >
                              All {category.name}
                            </Link>
                            {category.sub_categories.map((subCategory) => (
                              <Link
                                key={subCategory.id}
                                to={`/equipment?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(subCategory.name)}`}
                                onClick={() => setIsOpen(false)}
                                className="block rounded-lg px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                              >
                                {subCategory.name}
                              </Link>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <Link
                        to={`/equipment?category=${encodeURIComponent(category.name)}`}
                        onClick={() => setIsOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                      >
                        {category.name}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          {(loading || (user && profile)) && (
            <div className="mt-4 pt-4 border-t">
              {loading ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-2">
                  {profile?.role === 'Booker' && (
                    // Hide Book Now option for now
                    <Button asChild className="w-full hidden" hidden onClick={() => setIsOpen(false)}>
                      <Link to="/book">Book Now</Link>
                    </Button>
                  )}
                  {dashboardLink && (
                    <Button asChild variant="outline" className="w-full" onClick={() => setIsOpen(false)}>
                      <Link to={dashboardLink.path}>{dashboardLink.label}</Link>
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
                    Logout
                  </Button>
                </div>
              )}
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
