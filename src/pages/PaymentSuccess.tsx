import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const PaymentSuccess = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-lg px-4">
          <h1 className="text-3xl font-bold">Payment Successful</h1>
          <p>Your payment has been received. Your booking and invoice will update automatically once processing completes.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
