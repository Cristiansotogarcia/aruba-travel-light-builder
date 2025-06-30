import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HighlightProductsSettings } from './HighlightProductsSettings';
import { SubGroupOrderSettings } from './SubGroupOrderSettings';
import { useSiteAssets } from '@/hooks/useSiteAssets';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  useEffect(() => {
    setSiteTitle(assets.title || '');
  }, [assets.title]);

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

      <HighlightProductsSettings />
      <SubGroupOrderSettings />
    </div>
  );
};

export default SiteSettings;
