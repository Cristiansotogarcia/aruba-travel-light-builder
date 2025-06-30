
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/homepage/HeroSection';
import { FeaturedProducts } from '@/components/homepage/FeaturedProducts';
import { HowItWorks } from '@/components/homepage/HowItWorks';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturedProducts />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
