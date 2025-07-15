import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CloudflareImageUpload } from '@/components/admin/CloudflareImageUpload';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Image as ImageIcon } from 'lucide-react';

interface AboutContent {
  homepage: {
    title: string;
    short_description: string;
    about_image?: string;
  };
  aboutPage: {
    title: string;
    full_description: string;
    about_image?: string;
    additional_image?: string;
  };
}

const AboutUsManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAdditionalUploadOpen, setIsAdditionalUploadOpen] = useState(false);
  const [currentImageKey, setCurrentImageKey] = useState<string>('');
  const [currentImageType, setCurrentImageType] = useState<'homepage' | 'aboutPage'>('homepage');
  const [saving, setSaving] = useState(false);

  const { data: aboutContent, isLoading } = useQuery({
    queryKey: ['about-us-management'],
    queryFn: async () => {
      // Get homepage content
      const { data: homepageContent } = await supabase
        .from('content_blocks')
        .select('title, content')
        .eq('block_key', 'about_us_short')
        .eq('page_slug', 'homepage')
        .single();

      // Get about page content
      const { data: aboutPageContent } = await supabase
        .from('content_blocks')
        .select('title, content')
        .eq('block_key', 'about_us_full')
        .eq('page_slug', 'about-us')
        .single();

      // For now, we'll use placeholder images or null
      // The actual image URLs will be stored in the content itself
      return {
        homepage: {
          title: homepageContent?.title || 'About Us',
          short_description: homepageContent?.content || 'Learn more about our company and what we do.',
          about_image: undefined
        },
        aboutPage: {
          title: aboutPageContent?.title || 'About Us',
          full_description: aboutPageContent?.content || 'Welcome to our company. We are dedicated to providing excellent service and quality products to our customers.',
          about_image: undefined,
          additional_image: undefined
        }
      } as AboutContent;
    }
  });

  const [formData, setFormData] = useState<AboutContent>({
    homepage: {
      title: '',
      short_description: '',
      about_image: ''
    },
    aboutPage: {
      title: '',
      full_description: '',
      about_image: '',
      additional_image: ''
    }
  });

  // Update form data when content loads
  useEffect(() => {
    if (aboutContent) {
      setFormData(aboutContent);
    }
  }, [aboutContent]);

  const handleImageUpload = async (imageUrl: string, imageKey: string) => {
    try {
      // Simply update the local state for now
      // The images will be handled by the Cloudflare service
      if (imageKey === 'about_us_image') {
        setFormData(prev => ({
          ...prev,
          homepage: { ...prev.homepage, about_image: imageUrl },
          aboutPage: { ...prev.aboutPage, about_image: imageUrl }
        }));
      } else if (imageKey === 'about_us_additional_image') {
        setFormData(prev => ({
          ...prev,
          aboutPage: { ...prev.aboutPage, additional_image: imageUrl }
        }));
      }

      toast({
        title: "Success",
        description: "Image updated successfully"
      });
    } catch (error) {
      console.error('Error updating image:', error);
      toast({
        title: "Error",
        description: "Failed to update image",
        variant: "destructive"
      });
    }
  };

  const handleSaveContent = async (type: 'homepage' | 'aboutPage') => {
    setSaving(true);
    try {
      if (type === 'homepage') {
        const { error } = await supabase
          .from('content_blocks')
          .upsert({
            block_key: 'about_us_short',
            page_slug: 'homepage',
            title: formData.homepage.title,
            content: formData.homepage.short_description,
            block_type: 'text',
            is_active: true
          }, {
            onConflict: 'block_key,page_slug'
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('content_blocks')
          .upsert({
            block_key: 'about_us_full',
            page_slug: 'about-us',
            title: formData.aboutPage.title,
            content: formData.aboutPage.full_description,
            block_type: 'text',
            is_active: true
          }, {
            onConflict: 'block_key,page_slug'
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `${type === 'homepage' ? 'Homepage' : 'About page'} content updated successfully`
      });

      queryClient.invalidateQueries({ queryKey: ['about-us-management'] });
    } catch (error) {
      console.error('Error updating content:', error);
      toast({
        title: "Error",
        description: "Failed to update content",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">About Us Management</h1>
          <p className="text-gray-600 mt-1">Manage About Us content for homepage and about page</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">About Us Management</h1>
        <p className="text-gray-600 mt-1">Manage About Us content for homepage and about page</p>
      </div>

      <Tabs defaultValue="homepage" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="homepage">Homepage Section</TabsTrigger>
          <TabsTrigger value="aboutPage">About Page</TabsTrigger>
        </TabsList>

        <TabsContent value="homepage">
          <Card>
            <CardHeader>
              <CardTitle>Homepage About Us Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.homepage.title}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    homepage: { ...prev.homepage, title: e.target.value }
                  }))}
                  placeholder="About Us"
                />
              </div>

              <div>
                <Label>Short Description</Label>
                <Textarea
                  value={formData.homepage.short_description}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    homepage: { ...prev.homepage, short_description: e.target.value }
                  }))}
                  rows={4}
                  placeholder="Brief description for homepage..."
                />
              </div>

              <div>
                <Label>Image</Label>
                <div className="mt-2">
                  {formData.homepage.about_image ? (
                    <div className="relative inline-block">
                      <img
                        src={formData.homepage.about_image}
                        alt="About Us"
                        className="w-32 h-32 rounded-full object-cover"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute -top-2 -right-2"
                        onClick={() => {
                          setCurrentImageKey('about_us_image');
                          setCurrentImageType('homepage');
                          setIsUploadOpen(true);
                        }}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setCurrentImageKey('about_us_image');
                        setCurrentImageType('homepage');
                        setIsUploadOpen(true);
                      }}
                    >
                      Upload Image
                    </Button>
                  )}
                </div>
              </div>

              <Button
                onClick={() => handleSaveContent('homepage')}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Homepage Content'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aboutPage">
          <Card>
            <CardHeader>
              <CardTitle>About Us Page Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.aboutPage.title}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    aboutPage: { ...prev.aboutPage, title: e.target.value }
                  }))}
                  placeholder="About Us"
                />
              </div>

              <div>
                <Label>Full Description</Label>
                <Textarea
                  value={formData.aboutPage.full_description}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    aboutPage: { ...prev.aboutPage, full_description: e.target.value }
                  }))}
                  rows={10}
                  placeholder="Detailed description for about page..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Main Image</Label>
                  <div className="mt-2">
                    {formData.aboutPage.about_image ? (
                      <div className="relative inline-block">
                        <img
                          src={formData.aboutPage.about_image}
                          alt="About Us"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setCurrentImageKey('about_us_image');
                            setCurrentImageType('aboutPage');
                            setIsUploadOpen(true);
                          }}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setCurrentImageKey('about_us_image');
                          setCurrentImageType('aboutPage');
                          setIsUploadOpen(true);
                        }}
                      >
                        Upload Main Image
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Additional Image (Optional)</Label>
                  <div className="mt-2">
                    {formData.aboutPage.additional_image ? (
                      <div className="relative inline-block">
                        <img
                          src={formData.aboutPage.additional_image}
                          alt="Additional"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setCurrentImageKey('about_us_additional_image');
                            setCurrentImageType('aboutPage');
                            setIsAdditionalUploadOpen(true);
                          }}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setCurrentImageKey('about_us_additional_image');
                          setCurrentImageType('aboutPage');
                          setIsAdditionalUploadOpen(true);
                        }}
                      >
                        Upload Additional Image
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handleSaveContent('aboutPage')}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save About Page Content'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Image Upload Dialog */}
      <CloudflareImageUpload
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onImageSelect={(url) => handleImageUpload(url, currentImageKey)}
        selectedImageUrl={
          currentImageKey === 'about_us_image' 
            ? formData[currentImageType].about_image 
            : formData.aboutPage.additional_image
        }
      />

      <CloudflareImageUpload
        isOpen={isAdditionalUploadOpen}
        onClose={() => setIsAdditionalUploadOpen(false)}
        onImageSelect={(url) => handleImageUpload(url, 'about_us_additional_image')}
        selectedImageUrl={formData.aboutPage.additional_image}
      />
    </div>
  );
};

export default AboutUsManagement;
