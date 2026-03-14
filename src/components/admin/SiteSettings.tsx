import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HighlightProductsSettings } from './HighlightProductsSettings';
import { useSiteAssets } from '@/hooks/useSiteAssets';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Percent } from 'lucide-react';

const ASSETS = [
  { key: 'hero_image', label: 'Hero Background' },
  { key: 'logo', label: 'Website Logo' },
  { key: 'favicon', label: 'Favicon' }
] as const;

type AssetKey = (typeof ASSETS)[number]['key'];

export const SiteSettings = () => {
  const { assets, refresh } = useSiteAssets();
  const { toast } = useToast();
  const [files, setFiles] = useState<Record<AssetKey, File | null>>({
    hero_image: null,
    logo: null,
    favicon: null
  });
  const [uploading, setUploading] = useState<AssetKey | null>(null);
  const [siteTitle, setSiteTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');
  const [savingPaymentLink, setSavingPaymentLink] = useState(false);

  const { settings: accountingSettings, getNumericSetting, updateSetting: updateAccountingSetting } = useSystemSettings();
  const [processorFeePercent, setProcessorFeePercent] = useState('3.99');
  const [defaultCurrency, setDefaultCurrency] = useState('AWG');
  const [savingAccounting, setSavingAccounting] = useState(false);

  useEffect(() => {
    setSiteTitle(assets.title || '');
  }, [assets.title]);

  useEffect(() => {
    const fetchPaymentLink = async () => {
      const { data, error } = await supabase
        .from('content_blocks')
        .select('content')
        .eq('block_key', 'payment_link')
        .eq('page_slug', 'global')
        .maybeSingle();

      if (!error) {
        setPaymentLink(data?.content || '');
      }
    };
    fetchPaymentLink();
  }, []);

  useEffect(() => {
    const fee = getNumericSetting('processor_fee_percent', 3.99);
    setProcessorFeePercent(fee.toString());
    const currency = accountingSettings['default_currency'] || 'AWG';
    setDefaultCurrency(currency);
  }, [accountingSettings, getNumericSetting]);

  const handleFileChange = (key: AssetKey, file: File | null) => {
    setFiles(prev => ({ ...prev, [key]: file }));
  };

  const uploadAsset = async (key: AssetKey) => {
    const file = files[key];
    if (!file) return;
    setUploading(key);
    const path = `${key}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('site-assets')
      .upload(path, file, { upsert: true });
    if (error) {
      toast({ title: 'Error', description: 'Upload failed', variant: 'destructive' });
      setUploading(null);
      return;
    }
    await supabase.from('content_images').upsert(
      { image_key: key, file_path: data.path, file_size: file.size, mime_type: file.type },
      { onConflict: 'image_key' }
    );
    toast({ title: 'Success', description: `${key.replace('_', ' ')} updated` });
    setFiles(prev => ({ ...prev, [key]: null }));
    setUploading(null);
    await refresh();
  };

  const updateTitle = async () => {
    setSavingTitle(true);
    const { error } = await supabase
      .from('content_blocks')
      .upsert(
        {
          block_key: 'site_title',
          page_slug: 'global',
          title: 'Site Title',
          block_type: 'text',
          content: siteTitle,
        },
        { onConflict: 'block_key' }
      );

    if (error) {
      toast({ title: 'Error', description: 'Title update failed', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Title updated' });
      await refresh();
    }
    setSavingTitle(false);
  };

  const updatePaymentLink = async () => {
    setSavingPaymentLink(true);
    const { error } = await supabase
      .from('content_blocks')
      .upsert(
        {
          block_key: 'payment_link',
          page_slug: 'global',
          title: 'Payment Link',
          block_type: 'text',
          content: paymentLink,
        },
        { onConflict: 'block_key' }
      );

    if (error) {
      toast({ title: 'Error', description: 'Payment link update failed', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Payment link updated' });
    }
    setSavingPaymentLink(false);
  };

  const updateProcessorFee = async () => {
    setSavingAccounting(true);
    const fee = parseFloat(processorFeePercent);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast({
        title: 'Invalid Fee',
        description: 'Processor fee must be a number between 0 and 100',
        variant: 'destructive'
      });
      setSavingAccounting(false);
      return;
    }

    const result = await updateAccountingSetting(
      'processor_fee_percent',
      processorFeePercent,
      'decimal',
      'Default payment processor fee percentage'
    );

    if (result.success) {
      toast({
        title: 'Settings Saved',
        description: `Processor fee updated to ${processorFeePercent}%`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update processor fee',
        variant: 'destructive'
      });
    }
    setSavingAccounting(false);
  };

  const updateCurrency = async () => {
    setSavingAccounting(true);
    const result = await updateAccountingSetting(
      'default_currency',
      defaultCurrency,
      'string',
      'Default currency code for transactions'
    );

    if (result.success) {
      toast({
        title: 'Settings Saved',
        description: `Default currency updated to ${defaultCurrency}`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update currency',
        variant: 'destructive'
      });
    }
    setSavingAccounting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Site Assets</h1>
          <p className="text-gray-600 mt-1">Upload hero image, logo and favicon</p>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {ASSETS.map(({ key, label }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assets[key] && (
                key === 'hero_image' ? (
                  <div className="h-32 bg-cover bg-center rounded" style={{ backgroundImage: `url(${assets[key]})` }} />
                ) : (
                  <img src={assets[key]!} alt={label} className="h-24 object-contain mx-auto" />
                )
              )}
              <Input type="file" accept="image/*" onChange={e => handleFileChange(key, e.target.files?.[0] || null)} />
              <Button onClick={() => uploadAsset(key)} disabled={!files[key] || uploading === key}>
                {uploading === key ? 'Uploading...' : 'Upload'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Site Title</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={siteTitle} onChange={e => setSiteTitle(e.target.value)} />
          <Button onClick={updateTitle} disabled={savingTitle}>
            {savingTitle ? 'Saving...' : 'Save Title'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            This payment link will be automatically used when confirming bookings. It will be sent to customers via email.
          </p>
          <Input
            type="url"
            value={paymentLink}
            onChange={e => setPaymentLink(e.target.value)}
            placeholder="https://your-payment-provider.com/..."
          />
          <Button onClick={updatePaymentLink} disabled={savingPaymentLink}>
            {savingPaymentLink ? 'Saving...' : 'Save Payment Link'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Accounting Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="processor-fee" className="text-sm font-medium">
              Processor Fee Percentage (%)
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-[200px]">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="processor-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={processorFeePercent}
                  onChange={e => setProcessorFeePercent(e.target.value)}
                  className="pl-9"
                  placeholder="3.99"
                />
              </div>
              <Button onClick={updateProcessorFee} disabled={savingAccounting}>
                {savingAccounting ? 'Saving...' : 'Save Fee'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This percentage will be used to calculate processor fees on payments. Historical records will not be affected.
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="default-currency" className="text-sm font-medium">
              Default Currency
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-[200px]">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="default-currency"
                  value={defaultCurrency}
                  onChange={e => setDefaultCurrency(e.target.value.toUpperCase())}
                  className="pl-9"
                  placeholder="AWG"
                  maxLength={3}
                />
              </div>
              <Button onClick={updateCurrency} disabled={savingAccounting}>
                {savingAccounting ? 'Saving...' : 'Save Currency'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Three-letter currency code (e.g., AWG, USD, EUR) for new transactions.
            </p>
          </div>
        </CardContent>
      </Card>

      <HighlightProductsSettings />
    </div>
  );
};

export default SiteSettings;
