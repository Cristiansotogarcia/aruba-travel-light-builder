
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { useSiteAssets } from '@/hooks/useSiteAssets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingState from '@/components/common/LoadingState';
import { useEffect } from 'react'; // Import useEffect

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed loading to isSubmitting for clarity

  const auth = useAuth(); // Get the whole auth context
  const { assets } = useSiteAssets();
  const { toast } = useToast();
  const navigate = useNavigate();

  // useEffect to handle navigation after profile is loaded
  useEffect(() => {
    console.log('[Login] useEffect triggered', { 
      loading: auth.loading, 
      user: !!auth.user, 
      profile: !!auth.profile 
    });

    // Only attempt navigation if loading is complete and we have a user and profile
    if (!auth.loading && auth.user && auth.profile) {
      console.log('[Login] Conditions met, navigating...');
      const userRole = auth.profile.role;
      toast({
        title: "Welcome back!",
        description: `Successfully signed in as ${userRole}.`,
      });
      if (userRole === 'Admin' || userRole === 'SuperUser') {
        navigate('/admin');
      } else if (userRole === 'Driver') {
        navigate('/driver-dashboard');
      } else if (userRole === 'Booker') {
        navigate('/booker');
      } else if (userRole === 'Customer') {
        navigate('/customer-dashboard');
      } else {
        console.warn(`[Login] User role '${userRole}' not recognized, navigating to homepage.`);
        navigate('/'); // Fallback to homepage for unhandled roles
      }
    } else if (!auth.loading && auth.user && !auth.profile) {
      console.error("[Login] User authenticated, but profile not available.");
      toast({
        title: "Sign in issue",
        description: "Could not load user profile. Please try again or contact support.",
        variant: "destructive",
      });
    }
  }, [auth.user, auth.profile, auth.loading, navigate, toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Login] handleSignIn triggered');
    setIsSubmitting(true);

    const result = await auth.signIn(email, password);
    console.log('[Login] signIn result:', result);

    if (!result.success) {
      toast({
        title: "Sign in failed",
        description: result.error || "Invalid credentials",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md px-4">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img
                  src={assets.logo || '/placeholder.svg'}
                  alt="Travel Light Aruba"
                  className="h-16 w-auto"
                />
              </div>
              <CardTitle className="text-2xl font-bold">Welcome to Travel Light Aruba</CardTitle>
              <p className="text-gray-600">Sign in to your account</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting || auth.loading}>
                  <LoadingState 
                    isLoading={isSubmitting || auth.loading} 
                    spinnerSize="sm" 
                    message="Signing in..."
                    minHeight="24px"
                  >
                    Sign In
                  </LoadingState>
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <Link to="/" className="text-sm text-blue-600 hover:underline">
                  ← Back to homepage
                </Link>
              </div>

              {/* Sign-up link hidden until registration is enabled */}
              <div className="mt-4 text-center text-sm hidden" hidden>
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-blue-600 hover:underline">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
