import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const PaymentError = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking_id');

  useEffect(() => {
    const updateStatus = async () => {
      if (!bookingId) return;
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
    };
    updateStatus();
  }, [bookingId]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Payment Failed</h1>
          <p>We couldn't process your payment. Please try again.</p>
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
