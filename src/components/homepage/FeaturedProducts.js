import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { getFeaturedProducts } from '@/lib/queries/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const FeaturedProducts = () => {
    const { data: products = [] } = useQuery({
        queryKey: ['featured-products'],
        queryFn: getFeaturedProducts,
        staleTime: 5 * 60 * 1000,
    });

    if (products.length === 0) return null;

    const order = [
        'Ostrich Loung Chairs',
        'Tommy Bahama Beach Chair',
        'Shibumi Quiet Canopy',
        'Dream On Me Full Size Foldable Crib',
        'Jeep Jogger Stroller | Single',
        'Summer Portable Play Yard with Canopy',
    ];

    const sortedProducts = products
        .filter((p) => order.includes(p.name))
        .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
        .slice(0, 6);

    if (sortedProducts.length === 0) return null;

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
                <div className="grid md:grid-cols-3 gap-8">
                    {sortedProducts.map((product) => (
                        <Card
                            key={product.id}
                            className="overflow-hidden hover:shadow-lg transition-shadow"
                        >
                            {product.image_url && (
                                <img
                                    src={product.image_url}
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
                                    ${Number(product.price_per_day).toFixed(2)}/day
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