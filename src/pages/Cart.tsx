import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Cart from '@/components/cart/Cart';

const CartPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Your Cart</h1>
          <Cart />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CartPage;
