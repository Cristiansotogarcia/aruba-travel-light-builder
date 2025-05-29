
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const Login = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Employee Login</h1>
            <p className="text-gray-600">Access the internal dashboard</p>
          </div>
          {/* Login form will be implemented later */}
          <div className="mt-12 text-center text-gray-500">
            Login system coming soon...
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
