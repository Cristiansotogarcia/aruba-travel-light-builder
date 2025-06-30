import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { cloudflareUploadService } from '@/lib/services/cloudflareUploadService';
export const CloudflareImageUpload = ({ isOpen, onClose, onImageSelect, selectedImageUrl }) => {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);
    const { toast } = useToast();
    const handleFileSelect = (file) => {
        const validation = cloudflareUploadService.validateFile(file);
        if (!validation.valid) {
            toast({
                title: "Error",
                description: validation.error,
                variant: "destructive"
            });
            return;
        }
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target?.result);
        };
        reader.readAsDataURL(file);
        uploadFile(file);
    };
    const uploadFile = async (file) => {
        setUploading(true);
        setUploadProgress(0);
        try {
            // Add metadata
            const metadata = {
                requireSignedURLs: false,
                metadata: {
                    uploadedBy: 'admin-dashboard',
                    originalName: file.name,
                    uploadedAt: new Date().toISOString()
                }
            };
            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 200);
            const data = await cloudflareUploadService.uploadImage(file, metadata);
            clearInterval(progressInterval);
            setUploadProgress(100);
            if (data?.success && data?.result) {
                const imageUrl = data.result.variants?.[0] || cloudflareUploadService.getImageUrl(data.result.id);
                onImageSelect(imageUrl);
                toast({
                    title: "Success",
                    description: "Image uploaded successfully"
                });
                onClose();
            }
            else {
                throw new Error(data?.errors?.[0]?.message || 'Upload failed');
            }
        }
        catch (error) {
            console.error('Upload error:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to upload image",
                variant: "destructive"
            });
        }
        finally {
            setUploading(false);
            setUploadProgress(0);
            setPreviewUrl(null);
        }
    };
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        }
        else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };
    const handleInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };
    const handleClose = () => {
        if (!uploading) {
            setPreviewUrl(null);
            onClose();
        }
    };
    return (_jsx(Dialog, { open: isOpen, onOpenChange: handleClose, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Upload Image to Cloudflare" }), _jsx(DialogDescription, { children: "Select an image from your computer to upload to Cloudflare Images" })] }), _jsxs("div", { className: "space-y-4", children: [selectedImageUrl && !previewUrl && (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-sm font-medium", children: "Current image:" }), _jsx("img", { src: selectedImageUrl, alt: "Current", className: "w-20 h-20 object-cover rounded border" })] })), _jsx("div", { className: `border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-300 hover:border-gray-400'} ${uploading ? 'pointer-events-none opacity-50' : ''}`, onDragEnter: handleDrag, onDragLeave: handleDrag, onDragOver: handleDrag, onDrop: handleDrop, children: previewUrl ? (_jsxs("div", { className: "space-y-2", children: [_jsx("img", { src: previewUrl, alt: "Preview", className: "w-32 h-32 object-cover rounded mx-auto" }), _jsx("p", { className: "text-sm text-gray-600", children: "Preview" })] })) : (_jsxs("div", { className: "space-y-2", children: [_jsx(Upload, { className: "h-8 w-8 mx-auto text-gray-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium", children: dragActive ? 'Drop image here' : 'Drag and drop an image here' }), _jsx("p", { className: "text-xs text-gray-500", children: "or click to browse" })] })] })) }), uploading && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { children: "Uploading..." }), _jsxs("span", { children: [uploadProgress, "%"] })] }), _jsx(Progress, { value: uploadProgress, className: "w-full" })] })), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => fileInputRef.current?.click(), disabled: uploading, className: "flex-1", children: uploading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Uploading..."] })) : (_jsxs(_Fragment, { children: [_jsx(Upload, { className: "h-4 w-4 mr-2" }), "Choose File"] })) }), _jsxs(Button, { type: "button", variant: "ghost", onClick: handleClose, disabled: uploading, children: [_jsx(X, { className: "h-4 w-4 mr-2" }), "Cancel"] })] }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", onChange: handleInputChange, className: "hidden" }), _jsx("div", { className: "text-xs text-gray-500", children: "Supported formats: JPG, PNG, GIF, WebP (max 10MB)" })] })] }) }));
};
export default CloudflareImageUpload;
