import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { z } from 'zod';
import { Search, Eye, Facebook, Twitter, Upload, AlertCircle, CheckCircle } from 'lucide-react';

interface SeoManagerProps {
  slug?: string;
  contentType?: 'page' | 'post' | 'product';
  contentId?: string;
}

const seoSchema = z.object({
  metaTitle: z.string().min(1, 'Meta title is required').max(60, 'Meta title should be under 60 characters'),
  metaDescription: z.string().min(1, 'Meta description is required').max(160, 'Meta description should be under 160 characters'),
  canonicalUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  ogTitle: z.string().max(60, 'OG title should be under 60 characters').optional(),
  ogDescription: z.string().max(160, 'OG description should be under 160 characters').optional(),
  twitterTitle: z.string().max(60, 'Twitter title should be under 60 characters').optional(),
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

interface PageOption {
  slug: string;
  title: string;
  type: 'page' | 'post' | 'product';
}

const defaultPages: PageOption[] = [
  { slug: 'home', title: 'Homepage', type: 'page' },
  { slug: 'about', title: 'About Page', type: 'page' },
  { slug: 'contact', title: 'Contact Page', type: 'page' },
  { slug: 'equipment', title: 'Equipment Page', type: 'page' },
  { slug: 'book', title: 'Booking Page', type: 'page' },
];

export const SeoManager = ({ slug: initialSlug }: SeoManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState(initialSlug || 'home');
  const [availablePages, setAvailablePages] = useState<PageOption[]>(defaultPages);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
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
    loadAvailablePages();
  }, []);

  useEffect(() => {
    if (selectedSlug) {
      fetchSeoData();
    }
  }, [selectedSlug]);

  const loadAvailablePages = async () => {
    try {
      // Load equipment/products as potential SEO pages
      const { data: equipment } = await supabase
        .from('equipment')
        .select('id, name')
        .eq('availability', true);

      const equipmentPages: PageOption[] = equipment?.map(item => ({
        slug: `equipment/${item.id}`,
        title: `Product: ${item.name}`,
        type: 'product' as const
      })) || [];

      setAvailablePages([...defaultPages, ...equipmentPages]);
    } catch (error) {
      console.error('Error loading pages:', error);
    }
  };

  const fetchSeoData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('seo_meta')
        .select('*')
        .eq('page_slug', selectedSlug)
        .single();

      if (data) {
        setForm({
          metaTitle: data.meta_title || '',
          metaDescription: data.meta_description || '',
          canonicalUrl: data.canonical_url || '',
          ogTitle: data.og_title || '',
          ogDescription: data.og_description || '',
          ogImageFile: null,
          ogImageUrl: data.og_image_url || '',
          twitterTitle: data.twitter_title || '',
          twitterImageFile: null,
          twitterImageUrl: data.twitter_image_url || '',
        });
      } else {
        // Reset form for new page
        setForm({
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
      }
    } catch (error) {
      console.error('Error fetching SEO data:', error);
    }
    setLoading(false);
  };

  const validateImageSize = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const isValidSize = img.width >= 1200 && img.height >= 630;
        if (!isValidSize) {
          toast({
            title: 'Image Size Warning',
            description: 'For best results, use images that are at least 1200x630 pixels',
            variant: 'destructive'
          });
        }
        resolve(true); // Allow upload anyway but warn user
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    await validateImageSize(file);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const path = `seo/${selectedSlug}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('site-assets')
      .upload(path, file, { upsert: true });
      
    if (error) {
      toast({ 
        title: 'Upload Error', 
        description: 'Failed to upload image. Please try again.', 
        variant: 'destructive' 
      });
      return null;
    }
    return data.path;
  };

  const validateForm = () => {
    const result = seoSchema.safeParse({
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      canonicalUrl: form.canonicalUrl,
      ogTitle: form.ogTitle,
      ogDescription: form.ogDescription,
      twitterTitle: form.twitterTitle,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(error => {
        errors[error.path[0] as string] = error.message;
      });
      setValidationErrors(errors);
      return false;
    }
    
    setValidationErrors({});
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast({ 
        title: 'Validation Error', 
        description: 'Please fix the validation errors before saving.', 
        variant: 'destructive' 
      });
      return;
    }

    setSaving(true);

    try {
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
          page_slug: selectedSlug,
          meta_title: form.metaTitle,
          meta_description: form.metaDescription,
          canonical_url: form.canonicalUrl || null,
          og_title: form.ogTitle || form.metaTitle,
          og_description: form.ogDescription || form.metaDescription,
          og_image_url: ogImageUrl,
          twitter_title: form.twitterTitle || form.metaTitle,
          twitter_image_url: twitterImageUrl,
        },
        { onConflict: 'page_slug' }
      );

      if (error) {
        throw error;
      }

      toast({ 
        title: 'Success', 
        description: 'SEO settings saved successfully!',
        variant: 'default'
      });
      await fetchSeoData();
    } catch (error) {
      console.error('Save error:', error);
      toast({ 
        title: 'Save Error', 
        description: 'Failed to save SEO settings. Please try again.', 
        variant: 'destructive' 
      });
    }
    setSaving(false);
  };

  const getCharacterCountColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage > 90) return 'text-red-500';
    if (percentage > 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getImageUrl = (path: string) => {
    if (!path) return '';
    return supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading SEO settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Search className="h-8 w-8" />
            SEO Manager
          </h1>
          <p className="text-gray-600 mt-1">Optimize your pages for search engines and social media</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {availablePages.find(p => p.slug === selectedSlug)?.type || 'page'}
        </Badge>
      </div>

      {/* Page Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Page to Edit</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedSlug} onValueChange={setSelectedSlug}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a page to edit SEO settings" />
            </SelectTrigger>
            <SelectContent>
              {availablePages.map((page) => (
                <SelectItem key={page.slug} value={page.slug}>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {page.type}
                    </Badge>
                    {page.title}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic SEO</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Engine Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle" className="flex items-center gap-2">
                  Meta Title *
                  {validationErrors.metaTitle && <AlertCircle className="h-4 w-4 text-red-500" />}
                </Label>
                <Input
                  id="metaTitle"
                  value={form.metaTitle}
                  onChange={e => setForm({ ...form, metaTitle: e.target.value })}
                  placeholder="Enter the page title for search engines"
                  className={validationErrors.metaTitle ? 'border-red-500' : ''}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-xs ${getCharacterCountColor(form.metaTitle.length, 60)}`}>
                    {form.metaTitle.length}/60 characters
                  </p>
                  {validationErrors.metaTitle && (
                    <p className="text-xs text-red-500">{validationErrors.metaTitle}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="metaDescription" className="flex items-center gap-2">
                  Meta Description *
                  {validationErrors.metaDescription && <AlertCircle className="h-4 w-4 text-red-500" />}
                </Label>
                <Textarea
                  id="metaDescription"
                  value={form.metaDescription}
                  onChange={e => setForm({ ...form, metaDescription: e.target.value })}
                  placeholder="Write a compelling description that will appear in search results"
                  rows={3}
                  className={validationErrors.metaDescription ? 'border-red-500' : ''}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-xs ${getCharacterCountColor(form.metaDescription.length, 160)}`}>
                    {form.metaDescription.length}/160 characters
                  </p>
                  {validationErrors.metaDescription && (
                    <p className="text-xs text-red-500">{validationErrors.metaDescription}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="canonicalUrl">Canonical URL (Optional)</Label>
                <Input
                  id="canonicalUrl"
                  value={form.canonicalUrl}
                  onChange={e => setForm({ ...form, canonicalUrl: e.target.value })}
                  placeholder="https://example.com/canonical-page"
                  className={validationErrors.canonicalUrl ? 'border-red-500' : ''}
                />
                {validationErrors.canonicalUrl && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.canonicalUrl}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Use this to specify the preferred URL for this content to avoid duplicate content issues
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Facebook className="h-5 w-5" />
                Open Graph (Facebook, LinkedIn)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ogTitle">OG Title</Label>
                <Input
                  id="ogTitle"
                  value={form.ogTitle}
                  onChange={e => setForm({ ...form, ogTitle: e.target.value })}
                  placeholder="Leave empty to use Meta Title"
                />
                <p className={`text-xs mt-1 ${getCharacterCountColor(form.ogTitle.length, 60)}`}>
                  {form.ogTitle.length}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="ogDescription">OG Description</Label>
                <Textarea
                  id="ogDescription"
                  value={form.ogDescription}
                  onChange={e => setForm({ ...form, ogDescription: e.target.value })}
                  placeholder="Leave empty to use Meta Description"
                  rows={3}
                />
                <p className={`text-xs mt-1 ${getCharacterCountColor(form.ogDescription.length, 160)}`}>
                  {form.ogDescription.length}/160 characters
                </p>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  OG Image (1200x630 recommended)
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={e => setForm({ ...form, ogImageFile: e.target.files?.[0] || null })}
                  className="mt-1"
                />
                {form.ogImageUrl && (
                  <div className="mt-2">
                    <img
                      src={getImageUrl(form.ogImageUrl)}
                      alt="OG Preview"
                      className="h-32 w-auto object-contain border rounded"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Optimal size: 1200x630 pixels. Supported formats: JPG, PNG, WebP
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Twitter className="h-5 w-5" />
                Twitter Card
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="twitterTitle">Twitter Title</Label>
                <Input
                  id="twitterTitle"
                  value={form.twitterTitle}
                  onChange={e => setForm({ ...form, twitterTitle: e.target.value })}
                  placeholder="Leave empty to use Meta Title"
                />
                <p className={`text-xs mt-1 ${getCharacterCountColor(form.twitterTitle.length, 60)}`}>
                  {form.twitterTitle.length}/60 characters
                </p>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Twitter Image (1200x630 recommended)
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={e => setForm({ ...form, twitterImageFile: e.target.files?.[0] || null })}
                  className="mt-1"
                />
                {form.twitterImageUrl && (
                  <div className="mt-2">
                    <img
                      src={getImageUrl(form.twitterImageUrl)}
                      alt="Twitter Preview"
                      className="h-32 w-auto object-contain border rounded"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Optimal size: 1200x630 pixels. Supported formats: JPG, PNG, WebP
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Previews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Google Search Preview */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Google Search Result
                </h3>
                <div className="border rounded-lg p-4 bg-white space-y-2 max-w-2xl">
                  <p className="text-sm text-green-600">
                    {form.canonicalUrl || `${window.location.origin}/${selectedSlug}`}
                  </p>
                  <h4 className="text-xl text-blue-600 hover:underline cursor-pointer">
                    {form.metaTitle || 'Your page title will appear here'}
                  </h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {form.metaDescription || 'Your meta description will appear here. Make it compelling to encourage clicks from search results.'}
                  </p>
                </div>
              </div>

              {/* Facebook Preview */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Facebook className="h-5 w-5" />
                  Facebook/LinkedIn Share
                </h3>
                <div className="border rounded-lg overflow-hidden bg-white max-w-lg">
                  {(form.ogImageUrl || form.ogImageFile) && (
                    <div className="aspect-[1.91/1] bg-gray-200">
                      <img
                        src={form.ogImageFile ? URL.createObjectURL(form.ogImageFile) : getImageUrl(form.ogImageUrl)}
                        alt="OG Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 border-t">
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      {new URL(form.canonicalUrl || `${window.location.origin}/${selectedSlug}`).hostname}
                    </p>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {form.ogTitle || form.metaTitle || 'Your OG title will appear here'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {form.ogDescription || form.metaDescription || 'Your OG description will appear here'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Twitter Preview */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Twitter className="h-5 w-5" />
                  Twitter Card
                </h3>
                <div className="border rounded-xl overflow-hidden bg-white max-w-lg">
                  {(form.twitterImageUrl || form.twitterImageFile) && (
                    <div className="aspect-[1.91/1] bg-gray-200">
                      <img
                        src={form.twitterImageFile ? URL.createObjectURL(form.twitterImageFile) : getImageUrl(form.twitterImageUrl)}
                        alt="Twitter Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-sm text-gray-500 mb-1">
                      {new URL(form.canonicalUrl || `${window.location.origin}/${selectedSlug}`).hostname}
                    </p>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {form.twitterTitle || form.metaTitle || 'Your Twitter title will appear here'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {form.ogDescription || form.metaDescription || 'Your description will appear here'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-2"
          size="lg"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Save SEO Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SeoManager;
