import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  SPECIAL_REQUEST_TYPES,
  SPECIAL_REQUEST_TYPE_LABELS,
  specialRequestFormDefaults,
  specialRequestSchema,
  type SpecialRequestFormValues,
  type SpecialRequestType,
} from '@/lib/specialRequests/specialRequestSchema';
import { submitSpecialRequest } from '@/lib/specialRequests/api';

/**
 * Replaces the old mailto-only /contact page: a real Special Request form
 * that stores a row in public.special_requests and notifies staff by email.
 * See PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md (Workstream B).
 *
 * `?type=last_minute|special_arrangement|general` preselects the request
 * type, used by LastMinuteContactPrompt and the Special Arrangements section
 * below so a visitor lands here with the right option already chosen.
 */
export const SpecialRequestForm = () => {
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get('type');
  const initialType: SpecialRequestType = SPECIAL_REQUEST_TYPES.includes(
    requestedType as SpecialRequestType
  )
    ? (requestedType as SpecialRequestType)
    : specialRequestFormDefaults.request_type;

  const [values, setValues] = useState<SpecialRequestFormValues>({
    ...specialRequestFormDefaults,
    request_type: initialType,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SpecialRequestFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const setField = <K extends keyof SpecialRequestFormValues>(field: K, value: SpecialRequestFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = specialRequestSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SpecialRequestFormValues, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof SpecialRequestFormValues;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await submitSpecialRequest(result.data);
      setSubmitted(true);
      setValues({ ...specialRequestFormDefaults, request_type: initialType });
      setErrors({});
    } catch (err) {
      console.error('Failed to submit special request:', err);
      toast({
        title: 'Could not send your request',
        description: 'Please try again, or email us directly at info@travelightaruba.com.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 text-center space-y-2">
        <p className="font-medium text-foreground">Thanks — your request is in.</p>
        <p className="text-sm text-muted-foreground">
          We&apos;ll get back to you by email as soon as we can.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => setSubmitted(false)}>
          Send another request
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="special-request-name">Name</Label>
          <Input
            id="special-request-name"
            value={values.name}
            onChange={(e) => setField('name', e.target.value)}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="special-request-email">Email</Label>
          <Input
            id="special-request-email"
            type="email"
            value={values.email}
            onChange={(e) => setField('email', e.target.value)}
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="special-request-phone">Phone (optional)</Label>
          <Input
            id="special-request-phone"
            type="tel"
            value={values.phone ?? ''}
            onChange={(e) => setField('phone', e.target.value)}
            aria-invalid={!!errors.phone}
          />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="special-request-preferred-dates">Preferred dates (optional)</Label>
          <Input
            id="special-request-preferred-dates"
            placeholder="e.g. Dec 20 - Dec 27"
            value={values.preferred_dates ?? ''}
            onChange={(e) => setField('preferred_dates', e.target.value)}
            aria-invalid={!!errors.preferred_dates}
          />
          {errors.preferred_dates && <p className="text-sm text-destructive">{errors.preferred_dates}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="special-request-type">What's this about?</Label>
        <Select value={values.request_type} onValueChange={(v) => setField('request_type', v as SpecialRequestType)}>
          <SelectTrigger id="special-request-type" aria-invalid={!!errors.request_type}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPECIAL_REQUEST_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {SPECIAL_REQUEST_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.request_type && <p className="text-sm text-destructive">{errors.request_type}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="special-request-message">Tell us what you need</Label>
        <Textarea
          id="special-request-message"
          rows={5}
          value={values.message}
          onChange={(e) => setField('message', e.target.value)}
          aria-invalid={!!errors.message}
        />
        {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
      </div>

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? 'Sending…' : 'Send request'}
      </Button>
    </form>
  );
};

export default SpecialRequestForm;
