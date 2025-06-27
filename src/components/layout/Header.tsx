
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSiteAssets } from '@/hooks/useSiteAssets';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, signOut, loading } = useAuth();
  const { assets } = useSiteAssets();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/'); // Redirect to homepage after sign out
  };

  return (
    <header className="bg-white shadow-sm">
      <link rel="icon" href={assets.favicon || '/favicon.svg'} />
      <img src={assets.logo || '/favicon.svg'} alt="Site Logo" className="h-8 w-auto" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src={assets.logo || '/placeholder.svg'}
              alt="Travel Light Aruba"
              className="w-[198px] h-[94px] object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
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

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {loading ? (
              <p>Loading...</p>
            ) : user && profile ? (
              <>
                {profile.role === 'Booker' && (
                  <Link to="/book">
                    <Button>Book Now</Button>
                  </Link>
                )}
                {profile.role === 'Admin' || profile.role === 'SuperUser' ? (
                  <Link to="/admin">
                    <Button variant="outline">Admin Dashboard</Button>
                  </Link>
                ) : profile.role === 'Driver' ? (
                  <Link to="/driver-dashboard">
                    <Button variant="outline">Driver Dashboard</Button>
                  </Link>
                ) : profile.role === 'Booker' ? (
                  <Link to="/customer-dashboard">
                    <Button variant="outline">My Dashboard</Button>
                  </Link>
                ) : null}
                <Button variant="ghost" onClick={handleSignOut}>Logout</Button>
              </>
            ) : (
              <>
                <Link to="/book">
                  <Button>Book Now</Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline">Login</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              <Link
                to="/equipment"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Equipment
              </Link>
              <Link
                to="/about"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                to="/contact"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              <div className="flex flex-col space-y-2 px-3 py-2">
                {loading ? (
                  <p className="px-3 py-2 text-gray-700">Loading...</p>
                ) : user && profile ? (
                  <>
                    {profile.role === 'Booker' && (
                      <Link to="/book" onClick={() => setIsMenuOpen(false)}>
                        <Button className="w-full">Book Now</Button>
                      </Link>
                    )}
                    {profile.role === 'Admin' || profile.role === 'SuperUser' ? (
                      <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                        <Button variant="outline" className="w-full">Admin Dashboard</Button>
                      </Link>
                    ) : profile.role === 'Driver' ? (
                      <Link to="/driver-dashboard" onClick={() => setIsMenuOpen(false)}>
                        <Button variant="outline" className="w-full">Driver Dashboard</Button>
                      </Link>
                    ) : profile.role === 'Booker' ? (
                      <Link to="/customer-dashboard" onClick={() => setIsMenuOpen(false)}>
                        <Button variant="outline" className="w-full">My Dashboard</Button>
                      </Link>
                    ) : null}
                    <Button variant="ghost" className="w-full text-left px-3 py-2" onClick={() => { handleSignOut(); setIsMenuOpen(false); }}>Logout</Button>
                  </>
                ) : (
                  <>
                    <Link to="/book" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full">Book Now</Button>
                    </Link>
                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full">Login</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
