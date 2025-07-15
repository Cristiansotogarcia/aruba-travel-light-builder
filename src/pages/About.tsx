import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { CloudflareImageUpload } from '@/components/admin/CloudflareImageUpload';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, X } from 'lucide-react';

const About = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAdditionalUploadOpen, setIsAdditionalUploadOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState({
    title: '',
    full_description: ''
  });

  const { data: aboutContent, isLoading, refetch } = useQuery({
    queryKey: ['about-us-full-content'],
    queryFn: async () => {
      // Get about us content and images from metadata
      const { data: contentData } = await supabase
        .from('content_blocks')
        .select('title, content, metadata')
        .eq('block_key', 'about_us_full')
        .eq('page_slug', 'about-us')
        .single();

      const metadata = (contentData?.metadata as any) || {};
      
      const result = {
        title: contentData?.title || 'About Us',
        full_description: contentData?.content || 'Welcome to our company. We are dedicated to providing excellent service and quality products to our customers.',
        about_image: metadata?.about_image || undefined,
        additional_image: metadata?.additional_image || undefined
      };

      setEditedContent({
        title: result.title,
        full_description: result.full_description
      });

      return result;
    }
  });

  const handleImageUpload = async (imageUrl: string, imageKey: string) => {
    try {
      // Get current metadata
      const { data: contentData } = await supabase
        .from('content_blocks')
        .select('metadata')
        .eq('block_key', 'about_us_full')
        .eq('page_slug', 'about-us')
        .single();

      const metadata = (contentData?.metadata as any) || {};

      // Update metadata with new image URL
      const updatedMetadata = {
        ...metadata,
        [imageKey === 'about_us_image' ? 'about_image' : 'additional_image']: imageUrl
      };

      const { error } = await supabase
        .from('content_blocks')
        .upsert({
          block_key: 'about_us_full',
          page_slug: 'about-us',
          title: aboutContent?.title || 'About Us',
          content: aboutContent?.full_description || '',
          block_type: 'text',
          is_active: true,
          metadata: updatedMetadata
        }, {
          onConflict: 'block_key,page_slug'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Image updated successfully"
      });

      refetch();
    } catch (error) {
      console.error('Error updating image:', error);
      toast({
        title: "Error",
        description: "Failed to update image",
        variant: "destructive"
      });
    }
  };

  const handleSaveContent = async () => {
    try {
      const { error } = await supabase
        .from('content_blocks')
        .upsert({
          block_key: 'about_us_full',
          page_slug: 'about-us',
          title: editedContent.title,
          content: editedContent.full_description,
          block_type: 'text',
          is_active: true
        }, {
          onConflict: 'block_key,page_slug'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Content updated successfully"
      });

      setIsEditing(false);
      refetch();
    } catch (error) {
      console.error('Error updating content:', error);
      toast({
        title: "Error",
        description: "Failed to update content",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <Skeleton className="h-12 w-64 mx-auto mb-4" />
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900">{aboutContent?.title}</h1>
            {user?.role === 'Admin' && (
              <div className="flex gap-2 justify-center mt-4">
                {isEditing ? (
                  <>
                    <Button onClick={handleSaveContent} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-8">
            {/* Main Image */}
            <div className="flex justify-center">
              {aboutContent?.about_image ? (
                <div className="relative group">
                  <img 
                    src={aboutContent.about_image}
                    alt="About Us"
                    className="w-full max-w-2xl h-96 object-cover rounded-lg shadow-lg"
                  />
                  {user?.role === 'Admin' && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                      <Button
                        onClick={() => setIsUploadOpen(true)}
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Change Image
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full max-w-2xl h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                  {user?.role === 'Admin' ? (
                    <Button onClick={() => setIsUploadOpen(true)}>
                      Upload Image
                    </Button>
                  ) : (
                    <span className="text-gray-400">No image uploaded</span>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={editedContent.title}
                      onChange={(e) => setEditedContent(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Content</Label>
                    <Textarea
                      value={editedContent.full_description}
                      onChange={(e) => setEditedContent(prev => ({ ...prev, full_description: e.target.value }))}
                      rows={10}
                      className="min-h-[300px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {aboutContent?.full_description}
                  </p>
                </div>
              )}
            </div>

            {/* Additional Image */}
            {aboutContent?.additional_image && (
              <div className="flex justify-center">
                <div className="relative group">
                  <img 
                    src={aboutContent.additional_image}
                    alt="Additional About Us Image"
                    className="w-full max-w-xl h-64 object-cover rounded-lg shadow-lg"
                  />
                  {user?.role === 'Admin' && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                      <Button
                        onClick={() => setIsAdditionalUploadOpen(true)}
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Change Image
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Add Additional Image Button for Admin */}
            {user?.role === 'Admin' && !aboutContent?.additional_image && (
              <div className="flex justify-center">
                <Button onClick={() => setIsAdditionalUploadOpen(true)} variant="outline">
                  Add Additional Image
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Image Upload Dialogs */}
      <CloudflareImageUpload
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onImageSelect={(url) => handleImageUpload(url, 'about_us_image')}
        selectedImageUrl={aboutContent?.about_image}
      />

      <CloudflareImageUpload
        isOpen={isAdditionalUploadOpen}
        onClose={() => setIsAdditionalUploadOpen(false)}
        onImageSelect={(url) => handleImageUpload(url, 'about_us_additional_image')}
        selectedImageUrl={aboutContent?.additional_image}
      />
    </div>
  );
};

export default About;
