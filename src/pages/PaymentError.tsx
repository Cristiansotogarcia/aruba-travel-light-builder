import { Link } from 'react-router-dom';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

const PaymentError = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-lg px-4">
          <h1 className="text-3xl font-bold">Payment Failed</h1>
          <p>We could not process your payment. Your booking has not been cancelled automatically, so you can try again or contact support.</p>
          <Link to="/book" className="text-primary underline">
            Return to Booking
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentError;
