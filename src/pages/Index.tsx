
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/homepage/HeroSection';
import { FeaturedProducts } from '@/components/homepage/FeaturedProducts.jsx';
import { HowItWorks } from '@/components/homepage/HowItWorks';
import AboutUsSection from '@/components/homepage/AboutUsSection';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '@/lib/queries/products';

const Index = () => {
  useQuery({
    queryKey: ['equipment-products'],
    queryFn: getProducts,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturedProducts />
        <HowItWorks />
        <AboutUsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
