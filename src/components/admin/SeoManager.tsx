import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { z } from 'zod';

interface SeoManagerProps {
  slug: string;
}

const seoSchema = z.object({
  metaTitle: z.string().max(60, 'Max 60 characters'),
  metaDescription: z.string().max(160, 'Max 160 characters'),
  canonicalUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  ogTitle: z.string().max(60, 'Max 60 characters').optional(),
  ogDescription: z.string().max(160, 'Max 160 characters').optional(),
  twitterTitle: z.string().max(60, 'Max 60 characters').optional(),
});

interface SeoFormState {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImageFile: File | null;
  ogImageUrl: string;
  twitterTitle: string;
  twitterImageFile: File | null;
  twitterImageUrl: string;
}

export const SeoManager = ({ slug }: SeoManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SeoFormState>({
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    ogTitle: '',
    ogDescription: '',
    ogImageFile: null,
    ogImageUrl: '',
    twitterTitle: '',
    twitterImageFile: null,
    twitterImageUrl: '',
  });

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('seo_meta')
      .select('*')
      .eq('page_slug', slug)
      .single();

    if (data) {
      setForm(f => ({
        ...f,
        metaTitle: data.meta_title || '',
        metaDescription: data.meta_description || '',
        canonicalUrl: data.canonical_url || '',
        ogTitle: data.og_title || '',
        ogDescription: data.og_description || '',
        ogImageUrl: data.og_image_url || '',
        twitterTitle: data.twitter_title || '',
        twitterImageUrl: data.twitter_image_url || '',
      }));
    }
    setLoading(false);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const path = `seo/${slug}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('site-assets')
      .upload(path, file, { upsert: true });
    if (error) {
      toast({ title: 'Error', description: 'Image upload failed', variant: 'destructive' });
      return null;
    }
    return data.path;
  };

  const handleSave = async () => {
    const result = seoSchema.safeParse({
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      canonicalUrl: form.canonicalUrl,
      ogTitle: form.ogTitle,
      ogDescription: form.ogDescription,
      twitterTitle: form.twitterTitle,
    });

    if (!result.success) {
      toast({ title: 'Validation Error', description: result.error.errors[0].message, variant: 'destructive' });
      return;
    }

    setSaving(true);

    let ogImageUrl = form.ogImageUrl;
    if (form.ogImageFile) {
      const uploaded = await uploadImage(form.ogImageFile);
      if (uploaded) ogImageUrl = uploaded;
    }

    let twitterImageUrl = form.twitterImageUrl;
    if (form.twitterImageFile) {
      const uploaded = await uploadImage(form.twitterImageFile);
      if (uploaded) twitterImageUrl = uploaded;
    }

    const { error } = await supabase.from('seo_meta').upsert(
      {
        page_slug: slug,
        meta_title: form.metaTitle,
        meta_description: form.metaDescription,
        canonical_url: form.canonicalUrl || null,
        og_title: form.ogTitle,
        og_description: form.ogDescription,
        og_image_url: ogImageUrl,
        twitter_title: form.twitterTitle,
        twitter_image_url: twitterImageUrl,
      },
      { onConflict: 'page_slug' }
    );

    if (error) {
      toast({ title: 'Error', description: 'Failed to save SEO data', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'SEO data saved' });
      await fetchData();
    }
    setSaving(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">SEO Manager</h1>
        <p className="text-gray-600 mt-1">Manage SEO settings for {slug}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Meta Title</Label>
            <Input
              value={form.metaTitle}
              onChange={e => setForm({ ...form, metaTitle: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">{form.metaTitle.length}/60</p>
          </div>
          <div>
            <Label>Meta Description</Label>
            <Textarea
              value={form.metaDescription}
              onChange={e => setForm({ ...form, metaDescription: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">{form.metaDescription.length}/160</p>
          </div>
          <div>
            <Label>Canonical URL</Label>
            <Input
              value={form.canonicalUrl}
              onChange={e => setForm({ ...form, canonicalUrl: e.target.value })}
            />
          </div>
          <div>
            <Label>OG Title</Label>
            <Input value={form.ogTitle} onChange={e => setForm({ ...form, ogTitle: e.target.value })} />
            <p className="text-xs text-muted-foreground">{form.ogTitle.length}/60</p>
          </div>
          <div>
            <Label>OG Description</Label>
            <Textarea
              value={form.ogDescription}
              onChange={e => setForm({ ...form, ogDescription: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">{form.ogDescription.length}/160</p>
          </div>
          <div>
            <Label>OG Image (1200x630 recommended)</Label>
            <Input type="file" accept="image/*" onChange={e => setForm({ ...form, ogImageFile: e.target.files?.[0] || null })} />
            {form.ogImageUrl && <img src={supabase.storage.from('site-assets').getPublicUrl(form.ogImageUrl).data.publicUrl} alt="OG" className="mt-2 h-32 object-contain" />}
          </div>
          <div>
            <Label>Twitter Title</Label>
            <Input
              value={form.twitterTitle}
              onChange={e => setForm({ ...form, twitterTitle: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">{form.twitterTitle.length}/60</p>
          </div>
          <div>
            <Label>Twitter Image (1200x630 recommended)</Label>
            <Input type="file" accept="image/*" onChange={e => setForm({ ...form, twitterImageFile: e.target.files?.[0] || null })} />
            {form.twitterImageUrl && <img src={supabase.storage.from('site-assets').getPublicUrl(form.twitterImageUrl).data.publicUrl} alt="Twitter" className="mt-2 h-32 object-contain" />}
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save SEO'}
          </Button>
        </CardContent>
      </Card>
      <div>
        <h2 className="text-xl font-semibold mb-2">Preview</h2>
        <div className="border rounded p-4 bg-white space-y-2">
          <p className="text-sm text-muted-foreground">{form.canonicalUrl || `${window.location.origin}/${slug}`}</p>
          <p className="text-lg text-blue-600">{form.metaTitle || 'Page title'}</p>
          <p className="text-gray-800">{form.metaDescription || 'Description'}</p>
        </div>
        {form.ogImageUrl && (
          <div className="mt-4 border rounded w-80">
            <img
              src={supabase.storage.from('site-assets').getPublicUrl(form.ogImageUrl).data.publicUrl}
              alt="OG Preview"
              className="w-full h-40 object-cover rounded-t"
            />
            <div className="p-2">
              <p className="font-bold">{form.ogTitle}</p>
              <p className="text-sm text-gray-700">{form.ogDescription}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeoManager;
