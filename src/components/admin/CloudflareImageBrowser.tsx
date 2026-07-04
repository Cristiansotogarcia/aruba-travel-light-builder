import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Search, Image as ImageIcon, Check } from 'lucide-react';
import { cloudflareImageService, type CloudflareImage } from '@/lib/services/cloudflareImageService';
import { cn } from '@/lib/utils';

interface CloudflareImageBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (imageUrl: string) => void;
  selectedImageUrl?: string;
}

export const CloudflareImageBrowser: React.FC<CloudflareImageBrowserProps> = ({
  isOpen,
  onClose,
  onImageSelect,
  selectedImageUrl
}) => {
  const [images, setImages] = useState<CloudflareImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<CloudflareImage | null>(null);
  const [continuationToken, setContinuationToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  const loadImages = useCallback(async (options: { reset?: boolean; continuationToken?: string } = {}) => {
    const { reset = true, continuationToken: token } = options;
    if (!cloudflareImageService.isConfigured()) return;
    
    setLoading(true);
    try {
      const response = await cloudflareImageService.listImages(
        1, 
        50, 
        reset ? undefined : token
      );
      
      if (response.success) {
        const newImages = response.result.images;
        setImages((prevImages) => (reset ? newImages : [...prevImages, ...newImages]));
        setContinuationToken(response.result.continuation_token);
        setHasMore(!!response.result.continuation_token);
      } else {
        throw new Error('Failed to fetch images');
      }
    } catch (error) {
      console.error('Error loading images:', error);
      toast({
        title: "Error",
        description: "Failed to load images from Cloudflare.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen && cloudflareImageService.isConfigured()) {
      loadImages();
    } else if (isOpen && !cloudflareImageService.isConfigured()) {
      toast({
        title: "Configuration Required",
        description: "Please configure Cloudflare credentials in environment variables.",
        variant: "destructive"
      });
    }
  }, [isOpen, loadImages, toast]);

  const loadMoreImages = () => {
    if (hasMore && !loading) {
      loadImages({ reset: false, continuationToken });
    }
  };

  const filteredImages = images.filter(image => 
    image.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    image.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImageClick = (image: CloudflareImage) => {
    setSelectedImage(image);
  };

  const handleSelectImage = () => {
    if (selectedImage) {
      const imageUrl = cloudflareImageService.getImageUrl(selectedImage.id);
      onImageSelect(imageUrl);
      onClose();
    }
  };

  const isImageSelected = (image: CloudflareImage) => {
    return selectedImage?.id === image.id || 
           selectedImageUrl?.includes(image.id);
  };

  if (!cloudflareImageService.isConfigured()) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cloudflare Images</DialogTitle>
            <DialogDescription>
              Cloudflare Images is not configured. Please add the following environment variables:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
            <code className="block">CLOUDFLARE_ACCOUNT_ID=your_account_id</code>
            <code className="block">CLOUDFLARE_API_TOKEN=your_api_token</code>
            <p className="text-sm text-gray-600 mt-2">
              Note: These should be configured in your Supabase Edge Function environment, not as VITE_ prefixed variables.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select Image from Cloudflare</DialogTitle>
          <DialogDescription>
            Choose an image from your Cloudflare Images library
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search images by filename or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Images Grid */}
          <div className="overflow-y-auto max-h-96">
            {loading && images.length === 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredImages.map((image) => {
                  const imageUrl = cloudflareImageService.getImageUrl(image.id, 'thumbnail');
                  const isSelected = isImageSelected(image);
                  
                  return (
                    <div
                      key={image.id}
                      className={cn(
                        "relative aspect-square rounded-lg border-2 cursor-pointer transition-all hover:scale-105",
                        isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => handleImageClick(image)}
                    >
                      <img
                        src={imageUrl}
                        alt={image.filename}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg truncate">
                        {image.filename}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Load More Button */}
            {hasMore && !loading && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={loadMoreImages}>
                  Load More Images
                </Button>
              </div>
            )}
            
            {loading && images.length > 0 && (
              <div className="flex justify-center mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>

          {/* Selected Image Info */}
          {selectedImage && (
            <div className="border-t pt-4">
              <Label className="text-sm font-medium">Selected Image:</Label>
              <p className="text-sm text-gray-600 mt-1">{selectedImage.filename}</p>
              <p className="text-xs text-gray-500">ID: {selectedImage.id}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSelectImage} 
              disabled={!selectedImage}
            >
              Select Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CloudflareImageBrowser;
