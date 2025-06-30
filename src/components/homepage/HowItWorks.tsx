
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const steps = [
  {
    step: "1",
    title: "Browse",
    description: "Browse in our wide selection of Beach and Baby Equipment online"
  },
  {
    step: "2", 
    title: "Email us your dates",
    description: "Email your rental dates at info@travelightaruba.com and we will confirm availability as soon as possible"
  },
  {
    step: "3",
    title: "Delivery & Pickup",
    description: "We deliver to your hotel or vacation rental and pick up when you're done"
  },
  {
    step: "4",
    title: "Enjoy Your Vacation",
    description: "Relax and enjoy Aruba with everything you need at your fingertips"
  }
];

export const HowItWorks = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Renting equipment has never been easier. Get everything you need in just a few simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="text-center border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
