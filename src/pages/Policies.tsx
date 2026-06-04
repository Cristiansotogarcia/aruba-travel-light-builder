import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/common/SEO';

const Policies = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Rental Policies - Travel Light Aruba"
        description="Rental policies for Travel Light Aruba premium beach and baby equipment rentals in Aruba."
        pageSlug="policies"
      />
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Policies</h1>
          <p className="text-lg text-gray-700 mb-4">
            Our rental policies are being finalized and will be published here soon. For any
            questions in the meantime, please{' '}
            <a href="/contact" className="text-blue-600 hover:underline">
              contact us
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Policies;
