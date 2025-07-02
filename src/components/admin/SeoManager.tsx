import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Search, Save } from 'lucide-react';

interface SeoData {
  id?: string;
  page_slug: string;
  meta_title: string;
  meta_description: string;
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  twitter_title?: string;
  twitter_image_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface PageOption {
  slug: string;
  title: string;
  type: 'page' | 'product';
}

const defaultPages: PageOption[] = [
  { slug: 'home', title: 'Homepage', type: 'page' },
  { slug: 'about', title: 'About Page', type: 'page' },
  { slug: 'contact', title: 'Contact Page', type: 'page' },
  { slug: 'equipment', title: 'Equipment Page', type: 'page' },
  { slug: 'book', title: 'Booking Page', type: 'page' },
];

export const SeoManager: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState('home');
  const [availablePages] = useState<PageOption[]>(defaultPages);
  const [formData, setFormData] = useState<Partial<SeoData>>({
    page_slug: 'home',
    meta_title: '',
    meta_description: '',
    canonical_url: '',
    og_title: '',
    og_description: '',
    og_image_url: '',
    twitter_title: '',
    twitter_image_url: '',
  });

  useEffect(() => {
    if (selectedSlug) {
      fetchSeoData(selectedSlug);
    }
  }, [selectedSlug]);

  const fetchSeoData = async (slug: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('seo_meta')
        .select('*')
        .eq('page_slug', slug)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching SEO data:', error);
        throw error;
      }

      if (data) {
        setFormData({
          id: data.id,
          page_slug: data.page_slug,
          meta_title: data.meta_title || '',
          meta_description: data.meta_description || '',
          canonical_url: data.canonical_url || '',
          og_title: data.og_title || '',
          og_description: data.og_description || '',
          og_image_url: data.og_image_url || '',
          twitter_title: data.twitter_title || '',
          twitter_image_url: data.twitter_image_url || '',
        });
      } else {
        // Reset form for new page
        setFormData({
          page_slug: slug,
          meta_title: '',
          meta_description: '',
          canonical_url: '',
          og_title: '',
          og_description: '',
          og_image_url: '',
          twitter_title: '',
          twitter_image_url: '',
        });
      }
    } catch (error) {
      console.error('Error fetching SEO data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SEO data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof SeoData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.meta_title || formData.meta_title.trim().length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Meta title is required.',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.meta_description || formData.meta_description.trim().length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Meta description is required.',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.meta_title.length > 60) {
      toast({
        title: 'Validation Error',
        description: 'Meta title should be under 60 characters.',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.meta_description.length > 160) {
      toast({
        title: 'Validation Error',
        description: 'Meta description should be under 160 characters.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        page_slug: selectedSlug,
        meta_title: formData.meta_title?.trim(),
        meta_description: formData.meta_description?.trim(),
        canonical_url: formData.canonical_url?.trim() || null,
        og_title: formData.og_title?.trim() || formData.meta_title?.trim(),
        og_description: formData.og_description?.trim() || formData.meta_description?.trim(),
        og_image_url: formData.og_image_url?.trim() || null,
        twitter_title: formData.twitter_title?.trim() || formData.meta_title?.trim(),
        twitter_image_url: formData.twitter_image_url?.trim() || null,
      };

      const { error } = await supabase
        .from('seo_meta')
        .upsert(dataToSave, { onConflict: 'page_slug' });

      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: 'SEO settings saved successfully!',
        variant: 'default',
      });

      // Refresh data
      await fetchSeoData(selectedSlug);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save Error',
        description: 'Failed to save SEO settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getCharacterCountColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage > 90) return 'text-red-500';
    if (percentage > 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Search className="h-8 w-8" />
            SEO Manager
          </h1>
          <p className="text-gray-600 mt-1">Optimize your pages for search engines</p>
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

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading SEO data...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Basic SEO Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Basic SEO Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle">
                  Meta Title *
                </Label>
                <Input
                  id="metaTitle"
                  value={formData.meta_title || ''}
                  onChange={(e) => handleInputChange('meta_title', e.target.value)}
                  placeholder="Enter the page title for search engines"
                  maxLength={60}
                />
                <p className={`text-xs mt-1 ${getCharacterCountColor(formData.meta_title?.length || 0, 60)}`}>
                  {formData.meta_title?.length || 0}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="metaDescription">
                  Meta Description *
                </Label>
                <Textarea
                  id="metaDescription"
                  value={formData.meta_description || ''}
                  onChange={(e) => handleInputChange('meta_description', e.target.value)}
                  placeholder="Write a compelling description for search results"
                  rows={3}
                  maxLength={160}
                />
                <p className={`text-xs mt-1 ${getCharacterCountColor(formData.meta_description?.length || 0, 160)}`}>
                  {formData.meta_description?.length || 0}/160 characters
                </p>
              </div>

              <div>
                <Label htmlFor="canonicalUrl">Canonical URL (Optional)</Label>
                <Input
                  id="canonicalUrl"
                  value={formData.canonical_url || ''}
                  onChange={(e) => handleInputChange('canonical_url', e.target.value)}
                  placeholder="https://example.com/canonical-page"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Specify the preferred URL for this content to avoid duplicate content issues
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Social Media Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Social Media Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ogTitle">Open Graph Title (Facebook, LinkedIn)</Label>
                <Input
                  id="ogTitle"
                  value={formData.og_title || ''}
                  onChange={(e) => handleInputChange('og_title', e.target.value)}
                  placeholder="Leave empty to use Meta Title"
                  maxLength={60}
                />
                <p className={`text-xs mt-1 ${getCharacterCountColor(formData.og_title?.length || 0, 60)}`}>
                  {formData.og_title?.length || 0}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="ogDescription">Open Graph Description</Label>
                <Textarea
                  id="ogDescription"
                  value={formData.og_description || ''}
                  onChange={(e) => handleInputChange('og_description', e.target.value)}
                  placeholder="Leave empty to use Meta Description"
                  rows={3}
                  maxLength={160}
                />
                <p className={`text-xs mt-1 ${getCharacterCountColor(formData.og_description?.length || 0, 160)}`}>
                  {formData.og_description?.length || 0}/160 characters
                </p>
              </div>

              <div>
                <Label htmlFor="twitterTitle">Twitter Title</Label>
                <Input
                  id="twitterTitle"
                  value={formData.twitter_title || ''}
                  onChange={(e) => handleInputChange('twitter_title', e.target.value)}
                  placeholder="Leave empty to use Meta Title"
                  maxLength={60}
                />
                <p className={`text-xs mt-1 ${getCharacterCountColor(formData.twitter_title?.length || 0, 60)}`}>
                  {formData.twitter_title?.length || 0}/60 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Search Result Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-white space-y-2 max-w-2xl">
                <p className="text-sm text-green-600">
                  {formData.canonical_url || `https://travelightaruba.com/${selectedSlug}`}
                </p>
                <h4 className="text-xl text-blue-600 hover:underline cursor-pointer">
                  {formData.meta_title || 'Your page title will appear here'}
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {formData.meta_description || 'Your meta description will appear here. Make it compelling to encourage clicks from search results.'}
                </p>
              </div>
            </CardContent>
          </Card>

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
                  <Save className="h-4 w-4" />
                  Save SEO Settings
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default SeoManager;
