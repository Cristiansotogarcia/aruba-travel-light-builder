
import { Link } from 'react-router-dom';

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1">
            <div className="text-2xl font-semibold text-background mb-4">
              Travel Light Aruba
            </div>
            <p className="text-background/70 mb-4">
              Your trusted partner for beach and baby equipment rentals in Aruba.
            </p>
            <div className="text-sm text-background/70">
              <p>
                <a href="tel:+2975932028" className="hover:text-background transition-colors">
                  +297 593-2028
                </a>
              </p>
              <p>
                <a href="mailto:info@travelightaruba.com" className="hover:text-background transition-colors">
                  info@travelightaruba.com
                </a>
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-background/70">
              <li><Link to="/equipment" className="hover:text-background transition-colors">Equipment</Link></li>
              {/* Temporarily hide booking link until feature is available */}
              <li hidden className="hidden">
                <Link to="/book" className="hover:text-background transition-colors">Book Now</Link>
              </li>
              <li><Link to="/about" className="hover:text-background transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-background transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Categories</h3>
            <ul className="space-y-2 text-background/70">
              <li><Link to="/equipment?category=Beach Equipment" className="hover:text-background transition-colors">Beach Equipment</Link></li>
              <li><Link to="/equipment?category=Baby Equipment" className="hover:text-background transition-colors">Baby Equipment</Link></li>
            </ul>
          </div>

          {/* Business Hours */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Business Hours</h3>
            <div className="text-background/70 space-y-1">
              <p>Monday - Friday: 8AM - 6PM</p>
              <p>Saturday: 9AM - 5PM</p>
              <p>Sunday: CLOSED</p>
            </div>
          </div>
        </div>

        <div className="border-t border-background/15 mt-10 pt-8 text-center text-sm text-background/60">
          <p>&copy; {year} Travel Light Aruba. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
