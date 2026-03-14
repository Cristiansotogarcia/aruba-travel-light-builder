import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/common/SEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Contact = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Contact Travel Light Aruba - Premium Equipment Rentals"
        description="Get in touch with Travel Light Aruba for premium beach and baby equipment rentals in Aruba. Contact us for reservations, inquiries, and exceptional service."
        pageSlug="contact"
      />
      <Header />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-3xl font-semibold">Contact Us</CardTitle>
              <p className="text-muted-foreground">
                We'd love to hear from you. Reach out using the information below.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>To make a reservation for rentals, please send us an email to:</p>
              <p>
                <a href="mailto:info@travelightaruba.com" className="text-primary hover:underline">
                  info@travelightaruba.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
