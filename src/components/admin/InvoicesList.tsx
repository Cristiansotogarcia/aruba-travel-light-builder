import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getInvoiceDisplayNumber } from '@/lib/accounting/invoices';

interface InvoiceRow {
  id: string;
  booking_id: string;
  customer_email: string;
  customer_name: string;
  invoice_number: string;
  issued_at: string;
  total_amount: number;
}

export const InvoicesList = () => {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('id, booking_id, customer_email, customer_name, invoice_number, issued_at, total_amount')
          .order('issued_at', { ascending: false });

        if (error) {
          throw error;
        }

        setInvoices(data || []);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        toast({
          title: 'Error',
          description: 'Failed to load invoices.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [toast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-600 mt-1">Invoices issued for paid bookings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading invoices...</p>
          ) : invoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No invoices available yet.</p>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between border border-border/60 rounded-xl p-4">
                <div>
                  <p className="font-semibold text-foreground">
                    Invoice #{getInvoiceDisplayNumber(invoice.invoice_number, invoice.id)}
                  </p>
                  <p className="text-sm text-muted-foreground">{invoice.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{invoice.customer_email}</p>
                  <p className="text-xs text-muted-foreground">
                    Issued {new Date(invoice.issued_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-foreground">${Number(invoice.total_amount).toFixed(2)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/invoice/${invoice.id}`, '_blank')}
                  >
                    View Invoice
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicesList;
