
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useSiteAssets } from '@/hooks/useSiteAssets';

export const HeroSection = () => {
  const { assets } = useSiteAssets();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={assets.hero_image}
          alt="Aruba beach rentals"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/65" />
      </div>
      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[72vh] items-center py-16 sm:min-h-[70vh] sm:py-24">
            <div className="max-w-2xl text-white text-center mx-auto">
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">
                Travel Light Aruba
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-6xl">
                {assets.title || 'Premium Beach & Baby Equipment Rentals in Aruba'}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
                Make your Aruba vacation stress-free with high-quality rental equipment. From
                beach gear to baby essentials, everything is ready for you.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/equipment">
                  <Button size="lg" className="bg-white text-foreground hover:bg-white/90">
                    View Equipment
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/70 bg-white/15 text-white hover:bg-white/25"
                  >
                    Ask a Question
                  </Button>
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-white/75">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  Beach and baby essentials
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  Easy booking by email
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  Local, on-island support
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
