import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getProducts } from '@/lib/queries/products';
import { slugify } from '@/utils/slugify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Share2, ShoppingCart } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { SEO } from '@/components/common/SEO';
import { useSEO } from '@/hooks/useSEO';
import { useCart } from '@/hooks/useCart';
import type { AvailabilityStatus, Product } from '@/types/types';

const availabilityStatuses: AvailabilityStatus[] = [
  'Available',
  'Low Stock',
  'Out of Stock',
  'Temporarily Not Available',
];

const normalizeAvailabilityStatus = (
  status: string | null | undefined,
  stock: number
): AvailabilityStatus => {
  if (status && availabilityStatuses.includes(status as AvailabilityStatus)) {
    return status as AvailabilityStatus;
  }
  if (stock <= 0) return 'Out of Stock';
  if (stock <= 5) return 'Low Stock';
  return 'Available';
};

const EquipmentItem = () => {
  const { slug } = useParams<{ slug: string }>();
  const { generateProductSEO } = useSEO();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['equipment-products'],
    queryFn: getProducts,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const equipment = useMemo(() => {
    console.log('EquipmentItem - Looking for slug:', slug);
    console.log('EquipmentItem - Available products:', products.map(p => ({ name: p.name, slug: slugify(p.name) })));

    return products
      .map((p) => {
        const stock = p.stock_quantity ?? 0;
        let availability: 'available' | 'limited' | 'unavailable';
        if (stock <= 0) availability = 'unavailable';
        else if (stock <= 5) availability = 'limited';
        else availability = 'available';

        const availability_status = normalizeAvailabilityStatus(p.availability_status, stock);

        return {
          id: p.id,
          name: p.name,
          slug: slugify(p.name),
          category: p.equipment_category?.name || 'Uncategorized',
          price: p.price_per_day,
          price_per_week: p.price_per_week ?? undefined,

          image: (p.images && p.images[0]) || '',
          images: p.images || [],

          description: p.description || '',
          availability,
          availability_status,
          stock_quantity: stock,
          features: [],
        };
      })
      .find((item) => {
        console.log('EquipmentItem - Checking item:', item.name, 'slug:', item.slug, 'matches:', item.slug === slug);
        return item.slug === slug;
      });
  }, [products, slug]);

  const sanitizedDescription = useMemo(
    () => DOMPurify.sanitize(equipment?.description || ''),
    [equipment?.description]
  );

  // Generate SEO data for the current product
  const seoData = equipment ? generateProductSEO({
    id: equipment.id,
    name: equipment.name,
    description: equipment.description,
    images: equipment.images,
    price: equipment.price,
    category: equipment.category,
    slug: equipment.slug,
  }) : {
    title: 'Equipment Not Found - TLA Equipment Rentals',
    description: 'Browse our premium beach and baby equipment rentals in Aruba.',
    image: undefined,
    url: `${typeof window !== 'undefined' ? window.location.href : ''}`,
    type: 'website' as const,
    productData: undefined,
  };

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

  const handleQuantityChange = (value: string) => {
    if (!equipment) return;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      setQuantity(1);
      return;
    }
    const clamped = Math.min(Math.max(parsed, 1), equipment.stock_quantity || 1);
    setQuantity(clamped);
  };

  const handleAddToCart = () => {
    if (!equipment) return;
    if (equipment.stock_quantity <= 0) return;
    const product: Product = {
      id: equipment.id,
      name: equipment.name,
      description: equipment.description,
      price_per_day: equipment.price,
      price_per_week: equipment.price_per_week,
      category: equipment.category,
      images: equipment.images,
      stock_quantity: equipment.stock_quantity,
      availability_status: equipment.availability_status,
    };
    addItem(product, quantity);
    toast({ title: 'Added to cart', description: `${quantity} × ${equipment.name}` });
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading equipment...</div>;
  }

  if (!equipment) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-muted-foreground">Equipment not found.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Dynamic SEO Meta Tags */}
      <SEO
        title={seoData?.title}
        description={seoData?.description}
        image={seoData?.image || undefined}
        url={seoData?.url}
        type={seoData?.type}
        productData={seoData?.productData}
      />
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              {equipment.images.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {equipment.images.map((img, idx) => (
                      <CarouselItem key={idx}>
                        <div className="aspect-[4/3] w-full relative overflow-hidden rounded-2xl">
                          <img
                            src={img}
                            alt={`${equipment.name} image ${idx + 1}`}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              ) : (
                <div className="w-full aspect-[4/3] relative overflow-hidden rounded-2xl">
                  <img
                    src={equipment.image}
                    alt={equipment.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                  {equipment.name}
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  aria-label="Share"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="bg-[#00ADEF] text-white px-3 py-1 rounded-full text-xs font-semibold">
                  ${equipment.price.toFixed(2)}/day
                </span>
                <span className="bg-[#F7931E] text-white px-3 py-1 rounded-full text-xs font-semibold">
                  ${Number(equipment.price_per_week ?? equipment.price * 5).toFixed(2)}/week
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <label htmlFor="equipment-qty" className="text-sm text-muted-foreground">
                    Qty
                  </label>
                  <Input
                    id="equipment-qty"
                    type="number"
                    min={1}
                    max={equipment.stock_quantity || 1}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="w-24"
                    disabled={equipment.availability === 'unavailable'}
                  />
                  <span className="text-xs text-muted-foreground">
                    {equipment.stock_quantity} in stock
                  </span>
                </div>
                <Button
                  onClick={handleAddToCart}
                  disabled={equipment.availability === 'unavailable' || equipment.stock_quantity <= 0}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>

              <div className="text-sm sm:text-base text-muted-foreground whitespace-pre-line">
                <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
              </div>

              {equipment.features.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium text-foreground">Features:</p>
                  <ul className="list-disc list-inside pl-1 text-muted-foreground">
                    {equipment.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EquipmentItem;
