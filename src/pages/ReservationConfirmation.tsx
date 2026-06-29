import { useLocation, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/common/SEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSystemSettings } from '@/hooks/useSystemSettings';

interface ConfirmationState {
  bookingId: string;
  pickupCode: string | null;
  fulfillmentMethod: 'delivery' | 'pickup';
  customerName: string;
}

const ReservationConfirmation = () => {
  const location = useLocation();
  const state = location.state as ConfirmationState | null;
  const { getSetting } = useSystemSettings();

  const storeName = getSetting('store_name', 'Travel Light Aruba');
  const storeAddress = getSetting('store_address', '');
  const storeHours = getSetting('store_hours', '');

  const customerName = state?.customerName ?? '';
  const pickupCode = state?.pickupCode ?? null;
  const isPickup = state?.fulfillmentMethod === 'pickup' && pickupCode != null;

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Reservation Confirmed – Travel Light Aruba"
        description="Your equipment reservation has been received. We'll send you a payment link within 24 hours."
        pageSlug="reservation/confirmed"
      />
      <Header />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">

          {/* Success message — always shown */}
          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-3xl font-semibold text-green-600">
                Reservation received!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Thank you{customerName ? `, ${customerName}` : ''}. We'll review your reservation
                and email you a payment link within 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Back to home
                </Link>
                <Link
                  to="/equipment"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Browse more equipment
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Pickup code card — only for pickup orders with a code */}
          {isPickup && (
            <Card className="surface-card border-2 border-primary/30">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Store pickup details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pickup code */}
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
                    Your pickup code
                  </p>
                  <p className="text-4xl font-bold tracking-widest text-primary">
                    {pickupCode}
                  </p>
                </div>

                {/* QR code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg shadow-sm inline-block">
                    <QRCodeSVG value={pickupCode!} size={180} />
                  </div>
                </div>

                {/* Store info */}
                <div className="space-y-2 text-sm text-muted-foreground border-t pt-4">
                  {storeName && (
                    <p>
                      <span className="font-medium text-foreground">Store: </span>
                      {storeName}
                    </p>
                  )}
                  {storeAddress && (
                    <p>
                      <span className="font-medium text-foreground">Address: </span>
                      {storeAddress}
                    </p>
                  )}
                  {storeHours && (
                    <p>
                      <span className="font-medium text-foreground">Hours: </span>
                      {storeHours}
                    </p>
                  )}
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Bring this code (or QR) to our store to collect your equipment.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReservationConfirmation;
