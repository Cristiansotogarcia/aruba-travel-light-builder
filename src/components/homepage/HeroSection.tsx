
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen bg-cover bg-center bg-no-repeat" style={{
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/lovable-uploads/f00c75e1-9906-4e6e-919a-e1ef524a7e4c.png')`
    }}>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 min-h-screen flex items-center">
        <div className="text-center text-white w-full">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            Premium Beach & Baby Equipment Rentals in Aruba
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto drop-shadow-md">
            Make your Aruba vacation stress-free with our high-quality rental equipment. 
            From beach gear to baby essentials, we've got everything you need.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/book">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3 shadow-lg">
                Start Booking
              </Button>
            </Link>
            <Link to="/equipment">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-3 shadow-lg backdrop-blur-sm">
                View Equipment
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
