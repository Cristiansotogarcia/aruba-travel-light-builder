
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useSiteAssets } from '@/hooks/useSiteAssets';

export const HeroSection = () => {
  const { assets } = useSiteAssets();

  return (
    <section className="hero-section">
      <img
        src={assets.hero_image}
        alt="Hero"
        className="w-full h-auto object-cover"
      />
      <div className="hero-content">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
          {assets.title || 'Premium Beach & Baby Equipment Rentals in Aruba'}
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto drop-shadow-md">
          Make your Aruba vacation stress-free with our high-quality rental equipment.
          From beach gear to baby essentials, we've got everything you need.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/equipment">
            <Button size="lg" variant="outline" className="border-2 border-white bg-white text-blue-600 hover:bg-gray-100 hover:text-blue-700 text-lg px-8 py-3 shadow-lg">
              View Equipment
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
