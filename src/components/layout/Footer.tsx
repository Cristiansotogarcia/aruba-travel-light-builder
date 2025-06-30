
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1">
            <div className="text-2xl font-bold text-blue-400 mb-4">
              Travel Light Aruba
            </div>
            <p className="text-gray-400 mb-4">
              Your trusted partner for beach and baby equipment rentals in Aruba.
            </p>
            <div className="text-sm text-gray-400">
              <p style={{ display: 'none' }}>📞 +297 593-2028</p>
              <p>📧 info@travelightaruba.com</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/equipment" className="hover:text-white transition-colors">Equipment</Link></li>
              {/* Temporarily hide booking link until feature is available */}
              <li hidden className="hidden">
                <Link to="/book" className="hover:text-white transition-colors">Book Now</Link>
              </li>
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Categories</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/equipment?category=beach" className="hover:text-white transition-colors">Beach Equipment</Link></li>
              <li><Link to="/equipment?category=baby" className="hover:text-white transition-colors">Baby Equipment</Link></li>
            </ul>
          </div>

          {/* Business Hours */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Business Hours</h3>
            <div className="text-gray-400 space-y-1">
              <p>Monday - Friday: 8AM - 6PM</p>
              <p>Saturday: 9AM - 5PM</p>
              <p>Sunday: CLOSED</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 Travel Light Aruba. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
