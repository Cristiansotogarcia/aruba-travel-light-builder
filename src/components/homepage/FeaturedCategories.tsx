
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const categories = [
  {
    title: "Beach Equipment",
    description: "Umbrellas, chairs, coolers, and water sports gear",
    image: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21",
    items: ["Beach Umbrellas", "Beach Chairs", "Coolers", "Snorkel Gear"]
  },
  {
    title: "Baby Equipment",
    description: "Strollers, car seats, cribs, and safety gear",
    image: "https://images.unsplash.com/photo-1721322800607-8c38375eef04",
    items: ["Strollers", "Car Seats", "Baby Cribs", "High Chairs"]
  },
  {
    title: "Water Sports",
    description: "Kayaks, paddleboards, and water activity gear",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    items: ["Kayaks", "Paddleboards", "Life Jackets", "Water Toys"]
  }
];

export const FeaturedCategories = () => {
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
                <img 
                  src={category.image} 
                  alt={category.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{category.title}</CardTitle>
                <p className="text-gray-600">{category.description}</p>
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
