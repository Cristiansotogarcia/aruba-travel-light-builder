import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Search, Image as ImageIcon, Check } from 'lucide-react';
import { cloudflareImageService } from '@/lib/services/cloudflareImageService';
import { cn } from '@/lib/utils';
export const CloudflareImageBrowser = ({ isOpen, onClose, onImageSelect, selectedImageUrl }) => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [continuationToken, setContinuationToken] = useState();
    const [hasMore, setHasMore] = useState(true);
    const { toast } = useToast();
    useEffect(() => {
        if (isOpen && cloudflareImageService.isConfigured()) {
            loadImages();
        }
        else if (isOpen && !cloudflareImageService.isConfigured()) {
            toast({
                title: "Configuration Required",
                description: "Please configure Cloudflare credentials in environment variables.",
                variant: "destructive"
            });
        }
    }, [isOpen]);
    const loadImages = async (reset = true) => {
        if (!cloudflareImageService.isConfigured())
            return;
        setLoading(true);
        try {
            const response = await cloudflareImageService.listImages(1, 50, reset ? undefined : continuationToken);
            if (response.success) {
                const newImages = response.result.images;
                setImages(reset ? newImages : [...images, ...newImages]);
                setContinuationToken(response.result.continuation_token);
                setHasMore(!!response.result.continuation_token);
            }
            else {
                throw new Error('Failed to fetch images');
            }
        }
        catch (error) {
            console.error('Error loading images:', error);
            toast({
                title: "Error",
                description: "Failed to load images from Cloudflare.",
                variant: "destructive"
            });
        }
        finally {
            setLoading(false);
        }
    };
    const loadMoreImages = () => {
        if (hasMore && !loading) {
            loadImages(false);
        }
    };
    const filteredImages = images.filter(image => image.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        image.id.toLowerCase().includes(searchTerm.toLowerCase()));
    const handleImageClick = (image) => {
        setSelectedImage(image);
    };
    const handleSelectImage = () => {
        if (selectedImage) {
            const imageUrl = cloudflareImageService.getImageUrl(selectedImage.id);
            onImageSelect(imageUrl);
            onClose();
        }
    };
    const isImageSelected = (image) => {
        return selectedImage?.id === image.id ||
            selectedImageUrl?.includes(image.id);
    };
    if (!cloudflareImageService.isConfigured()) {
        return (_jsx(Dialog, { open: isOpen, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "max-w-2xl", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Cloudflare Images" }), _jsx(DialogDescription, { children: "Cloudflare Images is not configured. Please add the following environment variables:" })] }), _jsxs("div", { className: "space-y-2 p-4 bg-gray-50 rounded-lg", children: [_jsx("code", { className: "block", children: "VITE_CLOUDFLARE_ACCOUNT_ID=your_account_id" }), _jsx("code", { className: "block", children: "VITE_CLOUDFLARE_API_TOKEN=your_api_token" })] })] }) }));
    }
    return (_jsx(Dialog, { open: isOpen, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[80vh] overflow-hidden", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Select Image from Cloudflare" }), _jsx(DialogDescription, { children: "Choose an image from your Cloudflare Images library" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-3 h-4 w-4 text-gray-400" }), _jsx(Input, { placeholder: "Search images by filename or ID...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "pl-10" })] }), _jsxs("div", { className: "overflow-y-auto max-h-96", children: [loading && images.length === 0 ? (_jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: Array.from({ length: 8 }).map((_, i) => (_jsx(Skeleton, { className: "aspect-square rounded-lg" }, i))) })) : (_jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: filteredImages.map((image) => {
                                        const imageUrl = cloudflareImageService.getImageUrl(image.id, 'thumbnail');
                                        const isSelected = isImageSelected(image);
                                        return (_jsxs("div", { className: cn("relative aspect-square rounded-lg border-2 cursor-pointer transition-all hover:scale-105", isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"), onClick: () => handleImageClick(image), children: [_jsx("img", { src: imageUrl, alt: image.filename, className: "w-full h-full object-cover rounded-lg", onError: (e) => {
                                                        const target = e.target;
                                                        target.style.display = 'none';
                                                        target.nextElementSibling?.classList.remove('hidden');
                                                    } }), _jsx("div", { className: "hidden absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg", children: _jsx(ImageIcon, { className: "h-8 w-8 text-gray-400" }) }), isSelected && (_jsx("div", { className: "absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1", children: _jsx(Check, { className: "h-3 w-3" }) })), _jsx("div", { className: "absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg truncate", children: image.filename })] }, image.id));
                                    }) })), hasMore && !loading && (_jsx("div", { className: "flex justify-center mt-4", children: _jsx(Button, { variant: "outline", onClick: loadMoreImages, children: "Load More Images" }) })), loading && images.length > 0 && (_jsx("div", { className: "flex justify-center mt-4", children: _jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" }) }))] }), selectedImage && (_jsxs("div", { className: "border-t pt-4", children: [_jsx(Label, { className: "text-sm font-medium", children: "Selected Image:" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: selectedImage.filename }), _jsxs("p", { className: "text-xs text-gray-500", children: ["ID: ", selectedImage.id] })] })), _jsxs("div", { className: "flex justify-end space-x-2 border-t pt-4", children: [_jsx(Button, { variant: "outline", onClick: onClose, children: "Cancel" }), _jsx(Button, { onClick: handleSelectImage, disabled: !selectedImage, children: "Select Image" })] })] })] }) }));
};
export default CloudflareImageBrowser;
