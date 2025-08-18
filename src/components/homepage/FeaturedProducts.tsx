import { useQuery } from '@tanstack/react-query';
import { getFeaturedProducts } from '@/lib/queries/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const FeaturedProducts = () => {
    const { data: products = [] } = useQuery({
        queryKey: ['featured-products'],
        queryFn: getFeaturedProducts,
        staleTime: 30 * 1000, // 30 seconds
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    });

    // Debug logging
    console.log('FeaturedProducts - Raw products from query:', products);
    console.log('FeaturedProducts - Products length:', products.length);
    console.log('FeaturedProducts - Product names:', products.map(p => p.name));
    console.log('FeaturedProducts - Product sort orders:', products.map(p => ({ name: p.name, sort_order: p.sort_order })));

    if (products.length === 0) return null;

    // Products are already sorted by sort_order in the query
    // Limit to exactly 6 products for the grid layout
    const featuredProducts = products.slice(0, 6);

    if (featuredProducts.length === 0) return null;

    return (
        <section className="py-16 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        Popular Equipment
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Discover our most popular rental items
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {featuredProducts.map((product) => (
                        <Card
                            key={product.id}
                            className="overflow-hidden hover:shadow-lg transition-shadow"
                        >
                            {product.images?.[0] && (
                                <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="w-full h-48 object-cover"
                                />
                            )}
                            <CardHeader>
                                <CardTitle className="text-xl">{product.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {product.description && (
                                    <p className="text-gray-600 mb-2 line-clamp-3">
                                        {product.description}
                                    </p>
                                )}
                                <div className="text-lg font-bold mb-4">
                                    ${Number(product.price_per_day).toFixed(2)}/day |
                                    ${Number(product.price_per_day * 5).toFixed(2)}/week
                                </div>
                                <Link to="/equipment" className="block">
                                    <Button className="w-full">View All</Button>
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
