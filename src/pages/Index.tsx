
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/homepage/HeroSection';
import { FeaturedProducts } from '@/components/homepage/FeaturedProducts.jsx';
import { HowItWorks } from '@/components/homepage/HowItWorks';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '@/lib/queries/products';

const Index = () => {
  useQuery({
    queryKey: ['equipment-products'],
    queryFn: getProducts,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturedProducts />
        <HowItWorks />
        <div className="about-section">
          <h2>About Us</h2>
          <p>Short description here. <a href="/about">More about us</a></p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
