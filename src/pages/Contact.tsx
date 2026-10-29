import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/common/SEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SpecialRequestForm } from '@/components/contact/SpecialRequestForm';

// Special Arrangements (PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md, Workstream B /
// .scratch/tla/notes.txt): the handful of non-standard requests that need a
// human to look at them rather than the normal booking flow.
const SPECIAL_ARRANGEMENTS = [
  'Car seat delivery to your car rental place.',
  'Sunday crib delivery or collection (Full size crib, Mini crib, Pack and Play, Bedside Bassinet, Slumbertot).',
  'Moving a crib between a delivery address and a different collection address.',
];

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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
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

          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Special Arrangements</CardTitle>
              <p className="text-muted-foreground">
                A few requests need a human to look at them before we can confirm them online. If any of
                these apply to you, tell us about it in the form below and we'll follow up.
              </p>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {SPECIAL_ARRANGEMENTS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Send a Special Request</CardTitle>
              <p className="text-muted-foreground">
                Don&apos;t see what you need, can&apos;t find your dates, or need one of the special
                arrangements above? Send us your request here and we'll get back to you by email.
              </p>
            </CardHeader>
            <CardContent>
              <SpecialRequestForm />
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
