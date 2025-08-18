import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getProducts } from '@/lib/queries/products';
import { slugify } from '@/utils/slugify';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';

const EquipmentItem = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['equipment-products'],
    queryFn: getProducts,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const equipment = useMemo(() => {
    return products
      .map((p) => {
        const stock = p.stock_quantity ?? 0;
        let availability: 'available' | 'limited' | 'unavailable';
        if (stock <= 0) availability = 'unavailable';
        else if (stock <= 5) availability = 'limited';
        else availability = 'available';

        return {
          id: p.id,
          name: p.name,
          slug: slugify(p.name),
          category: p.equipment_category?.name || 'Uncategorized',
          price: p.price_per_day,

          images: p.images || [],

          image: p.image_url || (p.images && p.images[0]) || '',
          images: p.images || (p.image_url ? [p.image_url] : []),

          description: p.description || '',
          availability,
          features: [],
        };
      })
      .find((item) => item.slug === slug);
  }, [products, slug]);

  const sanitizedDescription = useMemo(
    () => DOMPurify.sanitize(equipment?.description || ''),
    [equipment?.description]
  );

  const handleShare = async () => {
    if (!equipment) return;
    const url = `${window.location.origin}/equipment/${equipment.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: equipment.name, url });
        return;
      } catch {
        // fallback to clipboard on share failure
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied' });
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  if (isLoading) {
    return <div className="py-8 text-center">Loading equipment...</div>;
  }

  if (!equipment) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center">Equipment not found.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">{equipment.name}</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              aria-label="Share"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          {equipment.images.length > 0 && (

          {equipment.images.length > 0 ? (

            <Carousel className="w-full mb-4">
              <CarouselContent>
                {equipment.images.map((img, idx) => (
                  <CarouselItem key={idx}>
                    <div className="aspect-square w-full relative overflow-hidden">
                      <img
                        src={img}
                        alt={`${equipment.name} image ${idx + 1}`}
                        className="absolute inset-0 w-full h-full object-cover rounded"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>

          ) : (
            <div className="aspect-square w-full relative overflow-hidden mb-4">
              <img
                src={equipment.image}
                alt={equipment.name}
                className="absolute inset-0 w-full h-full object-cover rounded"
              />
            </div>

          )}
          <div className="text-sm text-gray-700 whitespace-pre-line mb-4">
            <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
          </div>
          <div className="text-sm mb-4">
            <span className="font-semibold">Price:</span>{' '}
            ${equipment.price.toFixed(2)}/day | ${Number(equipment.price * 5).toFixed(2)}/week
          </div>
          {equipment.features.length > 0 && (
            <div className="text-sm">
              <p className="font-medium">Features:</p>
              <ul className="list-disc list-inside pl-1">
                {equipment.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EquipmentItem;
