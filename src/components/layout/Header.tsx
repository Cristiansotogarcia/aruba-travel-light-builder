
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSiteAssets } from '@/hooks/useSiteAssets';
import MobileNav from './MobileNav';

export const Header = () => {
  const { user, profile, signOut, loading } = useAuth();
  const { assets } = useSiteAssets();
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
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center">
            <img
              src={assets.logo || '/placeholder.svg'}
              alt="Travel Light Aruba"
              className="w-auto h-12 object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/equipment" className="text-gray-700 hover:text-blue-600 transition-colors">
              Equipment
            </Link>
            <Link to="/about" className="text-gray-700 hover:text-blue-600 transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-gray-700 hover:text-blue-600 transition-colors">
              Contact
            </Link>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            {loading ? (
              <p>Loading...</p>
            ) : user && profile ? (
              <>
                {profile.role === 'Booker' && (
                  // Hide Book Now button until booking is enabled
                  <Button asChild className="hidden" hidden>
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
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline">Login</Button>
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden">
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  );
};
