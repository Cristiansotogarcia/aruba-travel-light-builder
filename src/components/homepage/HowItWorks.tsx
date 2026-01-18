import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const steps = [
  {
    step: "01",
    title: "Browse Our Selection",
    description:
      "Explore our beach and baby equipment online and pick what you need for your stay.",
  },
  {
    step: "02",
    title: "Send Us Your Info",
    description: "Email info@travelightaruba.com with:",
    bullets: [
      "Full name",
      "Phone number",
      "Rental dates",
      "Preferred delivery and pickup time slots",
      "Accommodation address",
    ],
  },
  {
    step: "03",
    title: "Confirm and Pay",
    description:
      "We check availability, confirm your order, and send a secure payment link.",
  },
  {
    step: "04",
    title: "Delivery and Pickup",
    description:
      "We deliver your equipment directly to your stay and pick it up when you are done.",
  },
  {
    step: "05",
    title: "Enjoy Your Vacation",
    description: "Relax and enjoy Aruba with everything you need ready to go.",
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-3">
            How It Works
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Renting beach and baby gear is easy. Follow these simple steps.
          </p>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x md:grid md:grid-cols-2 lg:grid-cols-5 md:gap-6 md:overflow-visible">
          {steps.map((step, index) => (
            <Card
              key={index}
              className="min-w-[240px] snap-start border-2 border-transparent text-center transition-all hover:border-border/60 hover:shadow-soft"
            >
              <CardHeader>
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-base font-semibold mx-auto mb-4">
                  {step.step}
                </div>
                <CardTitle className="text-base sm:text-lg">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {step.bullets && (
                  <ul className="mt-3 space-y-1 text-left text-xs text-muted-foreground">
                    {step.bullets.map((bullet) => (
                      <li key={bullet}>- {bullet}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
