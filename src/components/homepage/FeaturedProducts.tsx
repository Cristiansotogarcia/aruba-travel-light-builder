import { useQuery } from '@tanstack/react-query';
import { getFeaturedProducts } from '@/lib/queries/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DOMPurify from 'dompurify';
import { ShoppingCart } from 'lucide-react';
import { cardImage } from '@/lib/images';
import { useGatedAddToCart } from '@/hooks/useGatedAddToCart';
import type { AvailabilityStatus, Product } from '@/types/types';

export const FeaturedProducts = () => {
    const { data: products = [] } = useQuery({
        queryKey: ['featured-products'],
        queryFn: getFeaturedProducts,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
    const { tryAdd, unitsForDates } = useGatedAddToCart();

    if (products.length === 0) return null;

    // Products are already sorted by sort_order in the query
    // Limit to exactly 8 products for the 4-wide grid layout (2 rows of 4)
    const featuredProducts = products.slice(0, 8);

    if (featuredProducts.length === 0) return null;

    return (
        <section className="py-16 sm:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 sm:mb-14">
                    <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-3">
                        Popular Equipment
                    </h2>
                    <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                        Discover our most popular rental items for easy island days.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {featuredProducts.map((product) => (
                        <Card
                            key={product.id}
                            className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-soft"
                        >
                            {product.images?.[0] && (
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    <img
                                        src={cardImage(product.images[0])}
                                        alt={product.name}
                                        loading="lazy"
                                        decoding="async"
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-foreground">
                                            ${Number(product.price_per_day).toFixed(2)}/day
                                        </span>
                                        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-foreground">
                                            ${Number(product.price_per_day * 5).toFixed(2)}/week
                                        </span>
                                    </div>
                                </div>
                            )}
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg sm:text-xl">{product.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {product.description && (
                                    <div
                                        className="text-sm text-muted-foreground mb-4 line-clamp-3"
                                        dangerouslySetInnerHTML={{
                                            __html: DOMPurify.sanitize(product.description),
                                        }}
                                    />
                                )}
                                {(() => {
                                    const units = unitsForDates(product.id);
                                    const paused = product.availability_status === 'Temporarily Not Available';
                                    const soldOut = paused || (units != null && units <= 0);
                                    const item: Product = {
                                        id: product.id,
                                        name: product.name,
                                        description: product.description,
                                        price_per_day: Number(product.price_per_day),
                                        price_per_week: product.price_per_week ?? undefined,
                                        category: product.equipment_category?.name ?? '',
                                        images: product.images ?? [],
                                        stock_quantity: product.stock_quantity ?? 0,
                                        availability_status: product.availability_status as AvailabilityStatus,
                                    };
                                    return (
                                        <>
                                            {units != null && (
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    {units > 0 ? `${units} available for your dates` : 'Not available for these dates'}
                                                </p>
                                            )}
                                            <Button
                                                className="w-full"
                                                disabled={soldOut}
                                                onClick={() => tryAdd(item, 1)}
                                            >
                                                <ShoppingCart className="h-4 w-4 mr-2" />
                                                {paused ? 'Temporarily Not Available' : 'Add to Cart'}
                                            </Button>
                                        </>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturedProducts;
