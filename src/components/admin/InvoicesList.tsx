import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InvoiceRow {
  id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  updated_at: string;
}

export const InvoicesList = () => {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('id, customer_name, customer_email, total_amount, updated_at')
          .eq('payment_status', 'paid')
          .order('updated_at', { ascending: false });

        if (error) throw error;
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
        <p className="text-gray-600 mt-1">Invoices are created after payment is confirmed.</p>
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
                  <p className="font-semibold text-foreground">Invoice #{invoice.id.substring(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">{invoice.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{invoice.customer_email}</p>
                  <p className="text-xs text-muted-foreground">
                    Paid {new Date(invoice.updated_at).toLocaleDateString()}
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
