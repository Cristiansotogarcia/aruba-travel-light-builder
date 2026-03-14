import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFeaturedProducts } from '@/lib/queries/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

type FeaturedProduct = {
  name: string;
  category?: string | null;
  images?: string[] | null;
};

export const FeaturedCategories = () => {
  const { data: products = [] } = useQuery<FeaturedProduct[]>({
    queryKey: ['featured-products'],
    queryFn: getFeaturedProducts,
    staleTime: 5 * 60 * 1000,
  });

  const categories = useMemo(() => {
    const groups: Record<string, FeaturedProduct[]> = {};
    for (const product of products) {
      if (!product.category || product.category === 'Water Sports') continue;
      if (!groups[product.category]) groups[product.category] = [];
      groups[product.category].push(product);
    }
    return Object.entries(groups).map(([title, items]) => ({
      title,
      description: '',
      image: items[0]?.images?.[0] || '',
      items: items.slice(0, 4).map((item) => item.name),
    }));
  }, [products]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-3">
            Popular Equipment
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover our wide range of high-quality rental equipment perfect for your Aruba vacation
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {categories.map((category, index) => (
            <Card
              key={index}
              className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-soft"
            >
              <div className="aspect-square relative overflow-hidden">
                {category.image && (
                  <img
                    src={category.image}
                    alt={category.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">{category.title}</CardTitle>
                {category.description && (
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-sm text-muted-foreground">
                      - {item}
                    </li>
                  ))}
                </ul>
                <Link to="/equipment" className="block">
                  <Button variant="secondary" className="w-full">
                    View All
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
