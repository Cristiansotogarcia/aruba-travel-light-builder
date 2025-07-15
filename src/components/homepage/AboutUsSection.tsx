import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

interface AboutContent {
  title: string;
  short_description: string;
  about_image?: string;
}

const AboutUsSection: React.FC = () => {
  const navigate = useNavigate();

  const { data: aboutContent, isLoading } = useQuery({
    queryKey: ['about-us-content'],
    queryFn: async () => {
      // Get about us content and image from metadata
      const { data: contentData } = await supabase
        .from('content_blocks')
        .select('title, content, metadata')
        .eq('block_key', 'about_us_short')
        .eq('page_slug', 'homepage')
        .single();

      const metadata = (contentData?.metadata as any) || {};
      
      return {
        title: contentData?.title || 'About Us',
        short_description: contentData?.content || 'Learn more about our company and what we do.',
        about_image: metadata?.about_image || undefined
      } as AboutContent;
    }
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Skeleton className="h-12 w-64 mx-auto mb-4" />
            </div>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-6" />
                <Skeleton className="h-10 w-32" />
              </div>
              <Skeleton className="h-96 w-full rounded-full" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              {aboutContent?.title}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Image first on mobile, text first on desktop */}
            <div className="flex justify-center md:order-last">
              {aboutContent?.about_image ? (
                <img 
                  src={aboutContent.about_image}
                  alt="About Us"
                  className="w-80 h-80 rounded-full object-cover shadow-lg"
                />
              ) : (
                <div className="w-80 h-80 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">No image uploaded</span>
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              <p className="text-lg text-gray-600 leading-relaxed">
                {aboutContent?.short_description}
              </p>
              <div className="text-center md:text-left">
                <Button 
                  onClick={() => navigate('/about-us')}
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                >
                  Read Complete Story
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUsSection;
