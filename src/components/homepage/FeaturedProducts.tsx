import { useQuery } from '@tanstack/react-query';
import { getFeaturedProducts } from '@/lib/queries/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';

export const FeaturedProducts = () => {
    const { data: products = [] } = useQuery({
        queryKey: ['featured-products'],
        queryFn: getFeaturedProducts,
        staleTime: 30 * 1000, // 30 seconds
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    });

    if (products.length === 0) return null;

    // Products are already sorted by sort_order in the query
    // Limit to exactly 6 products for the grid layout
    const featuredProducts = products.slice(0, 6);

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    {featuredProducts.map((product) => (
                        <Card
                            key={product.id}
                            className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-soft"
                        >
                            {product.images?.[0] && (
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    <img
                                        src={product.images[0]}
                                        alt={product.name}
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
                                <Link
                                    to={
                                        product.equipment_category?.name
                                            ? `/equipment?category=${encodeURIComponent(product.equipment_category.name)}`
                                            : '/equipment'
                                    }
                                    className="block"
                                >
                                    <Button variant="secondary" className="w-full">
                                        View Category
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturedProducts;
