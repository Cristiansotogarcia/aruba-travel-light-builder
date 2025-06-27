import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFeaturedProducts } from '@/lib/queries/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const FeaturedCategories = () => {
  const { data: products = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: getFeaturedProducts,
    staleTime: 5 * 60 * 1000,
  });

  const categories = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const product of products) {
      if (product.category === 'Water Sports') continue; // remove Water Sports
      if (!groups[product.category]) groups[product.category] = [];
      groups[product.category].push(product);
    }
    return Object.entries(groups).map(([title, items]) => ({
      title,
      description: '',
      image: items[0]?.image_url || '',
      items: items.slice(0, 4).map(i => i.name),
    }));
  }, [products]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Popular Equipment Categories
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover our wide range of high-quality rental equipment perfect for your Aruba vacation
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {categories.map((category, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video relative overflow-hidden">
                {category.image && (
                  <img
                    src={category.image}
                    alt={category.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                )}
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{category.title}</CardTitle>
                {category.description && <p className="text-gray-600">{category.description}</p>}
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-sm text-gray-700">
                      • {item}
                    </li>
                  ))}
                </ul>
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
