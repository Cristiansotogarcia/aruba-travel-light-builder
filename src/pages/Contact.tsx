import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/common/SEO';

const Contact = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* SEO Meta Tags */}
      <SEO
        title="Contact Travel Light Aruba - Premium Equipment Rentals"
        description="Get in touch with Travel Light Aruba for premium beach and baby equipment rentals in Aruba. Contact us for reservations, inquiries, and exceptional service."
        pageSlug="contact"
      />
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Contact Us</h1>
          <p className="text-lg text-gray-700 mb-4">
            We'd love to hear from you. Reach out using the information below.
          </p>
          <div className="space-y-2 text-gray-800">

            <p>To make a reservation for rentals, please send us an e-mail to:</p>

            <p>
              📧 <a href="mailto:info@travelightaruba.com" className="text-blue-600 hover:underline">info@travelightaruba.com</a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
