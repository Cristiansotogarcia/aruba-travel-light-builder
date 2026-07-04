import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileMinus, Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreditNoteRecord {
  id: string;
  booking_id: string;
  credit_number: string;
  amount: number;
  reason: string;
  created_by: string | null;
  created_at: string;
  bookings: {
    customer_name: string;
    customer_email: string;
    total_amount: number;
  } | null;
}

interface BookingOption {
  id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  start_date: string;
}

export const CreditNotesPanel = () => {
  const { toast } = useToast();
  const [creditNotes, setCreditNotes] = useState<CreditNoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  // Issuance dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingOptions, setBookingOptions] = useState<BookingOption[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingOption | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCreditNotes = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await (supabase as any)
        .from('credit_notes')
        .select('id, booking_id, credit_number, amount, reason, created_by, created_at, bookings(customer_name, customer_email, total_amount)')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setCreditNotes((data || []) as CreditNoteRecord[]);
    } catch (error) {
      console.error('Error fetching credit notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load credit notes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCreditNotes();
  }, [fetchCreditNotes]);

  // Booking search inside the dialog (debounced)
  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    const query = bookingSearch.trim();
    const timeoutId = window.setTimeout(async () => {
      try {
        let bookingsQuery = supabase
          .from('bookings')
          .select('id, customer_name, customer_email, total_amount, start_date')
          .order('created_at', { ascending: false })
          .limit(8);

        if (query) {
          bookingsQuery = bookingsQuery.or(
            `customer_name.ilike.%${query}%,customer_email.ilike.%${query}%`
          );
        }

        const { data, error } = await bookingsQuery;
        if (error) {
          throw error;
        }
        setBookingOptions((data || []) as BookingOption[]);
      } catch (error) {
        console.error('Error searching bookings:', error);
        setBookingOptions([]);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [bookingSearch, dialogOpen]);

  const alreadyCredited = useMemo(() => {
    if (!selectedBooking) {
      return 0;
    }
    return creditNotes
      .filter((note) => note.booking_id === selectedBooking.id)
      .reduce((sum, note) => sum + Number(note.amount), 0);
  }, [creditNotes, selectedBooking]);

  const remainingCreditable = selectedBooking
    ? Math.max(Number(selectedBooking.total_amount) - alreadyCredited, 0)
    : 0;

  const filteredNotes = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) {
      return creditNotes;
    }

    return creditNotes.filter((note) => {
      return (
        note.credit_number.toLowerCase().includes(query) ||
        note.booking_id.toLowerCase().includes(query) ||
        (note.bookings?.customer_name || '').toLowerCase().includes(query) ||
        (note.bookings?.customer_email || '').toLowerCase().includes(query) ||
        note.reason.toLowerCase().includes(query)
      );
    });
  }, [creditNotes, searchValue]);

  const resetDialog = () => {
    setSelectedBooking(null);
    setBookingSearch('');
    setBookingOptions([]);
    setAmount('');
    setReason('');
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetDialog();
    }
  };

  const handleSubmit = async () => {
    if (!selectedBooking) {
      toast({ title: 'Select a booking', description: 'Pick the booking to credit first.', variant: 'destructive' });
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter an amount greater than zero.', variant: 'destructive' });
      return;
    }
    if (parsedAmount > remainingCreditable) {
      toast({
        title: 'Amount too high',
        description: `At most $${remainingCreditable.toFixed(2)} can still be credited for this booking.`,
        variant: 'destructive',
      });
      return;
    }
    if (!reason.trim()) {
      toast({ title: 'Reason required', description: 'Describe why this credit note is issued.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any).rpc('create_credit_note', {
        p_booking_id: selectedBooking.id,
        p_amount: parsedAmount,
        p_reason: reason.trim(),
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Credit note issued',
        description: `${data?.credit_number ?? 'Credit note'} for $${parsedAmount.toFixed(2)} recorded.`,
      });
      handleOpenChange(false);
      fetchCreditNotes();
    } catch (error: any) {
      console.error('Error creating credit note:', error);
      toast({
        title: 'Could not issue credit note',
        description: error?.message || 'Unexpected error while creating the credit note.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Credit Notes</h1>
          <p className="text-muted-foreground mt-1">
            Issue credits against bookings and keep a sequential register for accounting.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Credit Note
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Credit Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-xl">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by credit number, customer, booking id, or reason"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Credit Note Register</CardTitle>
          <span className="text-sm text-muted-foreground">{filteredNotes.length} results</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading credit notes...</p>
          ) : filteredNotes.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No credit notes issued yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit Note</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell>
                        <div className="font-medium text-foreground flex items-center gap-2">
                          <FileMinus className="h-4 w-4 text-red-500" />
                          {note.credit_number}
                        </div>
                        <div className="text-xs text-muted-foreground">{note.booking_id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {note.bookings?.customer_name || 'Unknown customer'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {note.bookings?.customer_email || ''}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span className="text-sm text-foreground line-clamp-2">{note.reason}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        -${Number(note.amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue Credit Note</DialogTitle>
            <DialogDescription>
              Credits reduce the amount owed on a booking. The total credited can never
              exceed the booking total.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credit-booking-search">Booking</Label>
              {selectedBooking ? (
                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedBooking.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedBooking.customer_email} · Total ${Number(selectedBooking.total_amount).toFixed(2)}
                    </p>
                    {alreadyCredited > 0 && (
                      <p className="text-xs text-red-600">
                        Already credited ${alreadyCredited.toFixed(2)} — ${remainingCreditable.toFixed(2)} remaining
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(null)}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    id="credit-booking-search"
                    value={bookingSearch}
                    onChange={(event) => setBookingSearch(event.target.value)}
                    placeholder="Search bookings by customer name or email"
                  />
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-border/60 divide-y divide-border/60">
                    {bookingOptions.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-muted-foreground">No bookings found.</p>
                    ) : (
                      bookingOptions.map((booking) => (
                        <button
                          key={booking.id}
                          type="button"
                          onClick={() => setSelectedBooking(booking)}
                          className="w-full text-left px-3 py-2 hover:bg-accent/40 transition-colors"
                        >
                          <p className="text-sm font-medium text-foreground">{booking.customer_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {booking.customer_email} · Starts {new Date(booking.start_date).toLocaleDateString()} · $
                            {Number(booking.total_amount).toFixed(2)}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit-amount">Amount (USD)</Label>
              <Input
                id="credit-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
              {selectedBooking && (
                <p className="text-xs text-muted-foreground">
                  Up to ${remainingCreditable.toFixed(2)} can be credited.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit-reason">Reason</Label>
              <Textarea
                id="credit-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Equipment returned early, goodwill adjustment, damaged item refund"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Issuing...' : 'Issue Credit Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
