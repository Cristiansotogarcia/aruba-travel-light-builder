
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const Book = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Book Your Equipment</h1>
            <p className="text-xl text-gray-600">Select your dates and choose your equipment</p>
          </div>
          {/* Booking interface will be implemented later */}
          <div className="mt-12 text-center text-gray-500">
            Booking system coming soon...
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Book;
