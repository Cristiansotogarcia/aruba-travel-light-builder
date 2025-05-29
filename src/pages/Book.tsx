
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BookingForm } from '@/components/booking/BookingForm';
import { QuickBooking } from '@/components/booking/QuickBooking';

const Book = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Book Your Equipment</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Select your rental dates, choose your equipment, and we'll deliver everything to your location in Aruba
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Booking Form */}
            <div className="lg:col-span-3">
              <BookingForm />
            </div>

            {/* Quick Booking Sidebar */}
            <div className="lg:col-span-1">
              <QuickBooking />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Book;
