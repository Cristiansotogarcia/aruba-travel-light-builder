import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Search, Save, Image as ImageIcon, Upload, ExternalLink, X } from 'lucide-react';
import { CloudflareImageUpload } from './CloudflareImageUpload';
import { CloudflareImageBrowser } from './CloudflareImageBrowser';

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

interface SeoManagerProps {
  slug?: string;
}

export const SeoManager: React.FC<SeoManagerProps> = ({ slug = 'home' }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState(slug);
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

  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showImageBrowser, setShowImageBrowser] = useState(false);
  const [currentImageField, setCurrentImageField] = useState<'og_image_url' | 'twitter_image_url' | null>(null);

  const fetchSeoData = useCallback(async (slug: string) => {
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
  }, [toast]);

  useEffect(() => {
    if (selectedSlug) {
      fetchSeoData(selectedSlug);
    }
  }, [fetchSeoData, selectedSlug]);

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

      const { data: savedData, error } = await supabase
        .from('seo_meta')
        .upsert(dataToSave, { onConflict: 'page_slug' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (savedData) {
        setFormData({
          id: savedData.id,
          page_slug: savedData.page_slug,
          meta_title: savedData.meta_title || '',
          meta_description: savedData.meta_description || '',
          canonical_url: savedData.canonical_url || '',
          og_title: savedData.og_title || '',
          og_description: savedData.og_description || '',
          og_image_url: savedData.og_image_url || '',
          twitter_title: savedData.twitter_title || '',
          twitter_image_url: savedData.twitter_image_url || '',
        });
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

  const ImagePreview = ({ imageUrl, onRemove, label }: { imageUrl: string; onRemove: () => void; label: string }) => (
    <div className="relative group">
      <img
        src={imageUrl}
        alt={label}
        className="w-full max-w-md h-48 object-cover rounded-lg border"
      />
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <a
        href={imageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 bg-black/70 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );

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
            <CardContent className="space-y-6">
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

              {/* Open Graph Image */}
              <div>
                <Label>Open Graph Image (Facebook)</Label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentImageField('og_image_url');
                        setShowImageUpload(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload New
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentImageField('og_image_url');
                        setShowImageBrowser(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Browse Library
                    </Button>
                  </div>
                  
                  {formData.og_image_url && (
                    <ImagePreview 
                      imageUrl={formData.og_image_url} 
                      onRemove={() => handleInputChange('og_image_url', '')}
                      label="Open Graph"
                    />
                  )}
                  
                  <p className="text-xs text-gray-500">
                    Recommended: 1200×630 pixels for optimal Facebook display
                  </p>
                </div>
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

              {/* Twitter Image */}
              <div>
                <Label>Twitter Image</Label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentImageField('twitter_image_url');
                        setShowImageUpload(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload New
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentImageField('twitter_image_url');
                        setShowImageBrowser(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Browse Library
                    </Button>
                  </div>
                  
                  {formData.twitter_image_url && (
                    <ImagePreview 
                      imageUrl={formData.twitter_image_url} 
                      onRemove={() => handleInputChange('twitter_image_url', '')}
                      label="Twitter"
                    />
                  )}
                  
                  <p className="text-xs text-gray-500">
                    Recommended: 1200×675 pixels for optimal Twitter display
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Social Media Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Facebook Preview */}
                <div>
                  <h4 className="font-medium mb-3">Facebook Preview</h4>
                  <div className="border rounded-lg overflow-hidden">
                    {formData.og_image_url && (
                      <img 
                        src={formData.og_image_url} 
                        alt="Facebook preview" 
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-3 bg-gray-50">
                      <p className="text-xs text-gray-600 mb-1">
                        travelightaruba.com
                      </p>
                      <h5 className="font-semibold text-sm mb-1">
                        {formData.og_title || formData.meta_title || 'Your page title'}
                      </h5>
                      <p className="text-xs text-gray-700">
                        {formData.og_description || formData.meta_description || 'Your page description'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Twitter Preview */}
                <div>
                  <h4 className="font-medium mb-3">Twitter Preview</h4>
                  <div className="border rounded-lg overflow-hidden">
                    {formData.twitter_image_url && (
                      <img 
                        src={formData.twitter_image_url} 
                        alt="Twitter preview" 
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-3 bg-gray-50">
                      <h5 className="font-semibold text-sm mb-1">
                        {formData.twitter_title || formData.meta_title || 'Your page title'}
                      </h5>
                      <p className="text-xs text-gray-700">
                        {formData.meta_description || 'Your page description'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        travelightaruba.com
                      </p>
                    </div>
                  </div>
                </div>
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

      {/* Cloudflare Image Upload Modal */}
      <CloudflareImageUpload
        isOpen={showImageUpload}
        onClose={() => setShowImageUpload(false)}
        onImageSelect={(imageUrl) => {
          if (currentImageField) {
            handleInputChange(currentImageField, imageUrl);
          }
          setShowImageUpload(false);
          setCurrentImageField(null);
        }}
        selectedImageUrl={currentImageField ? formData[currentImageField] || '' : ''}
      />

      {/* Cloudflare Image Browser Modal */}
      <CloudflareImageBrowser
        isOpen={showImageBrowser}
        onClose={() => setShowImageBrowser(false)}
        onImageSelect={(imageUrl) => {
          if (currentImageField) {
            handleInputChange(currentImageField, imageUrl);
          }
          setShowImageBrowser(false);
          setCurrentImageField(null);
        }}
        selectedImageUrl={currentImageField ? formData[currentImageField] || '' : ''}
      />
    </div>
  );
};
