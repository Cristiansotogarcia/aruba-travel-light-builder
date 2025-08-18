import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { cloudflareUploadService } from '@/lib/services/cloudflareUploadService';

interface CloudflareImageUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (imageUrl: string) => void;
  selectedImageUrl?: string;
}

export const CloudflareImageUpload: React.FC<CloudflareImageUploadProps> = ({
  isOpen,
  onClose,
  onImageSelect,
  selectedImageUrl
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
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
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
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
      } else {
        throw new Error(data?.errors?.[0]?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setPreviewUrl(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Image to Cloudflare</DialogTitle>
          <DialogDescription>
            Select an image from your computer to upload to Cloudflare Images
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current selected image */}
          {selectedImageUrl && !previewUrl && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Current image:</p>
                <img
                  src={selectedImageUrl}
                  alt="Current"
                  className="w-20 h-auto max-h-20 object-contain rounded border"
                />
            </div>
          )}

          {/* Upload area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-gray-400'
            } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <div className="space-y-2">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-32 h-auto max-h-32 object-contain rounded mx-auto"
                  />
                <p className="text-sm text-gray-600">Preview</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-gray-400" />
                <div>
                  <p className="text-sm font-medium">
                    {dragActive ? 'Drop image here' : 'Drag and drop an image here'}
                  </p>
                  <p className="text-xs text-gray-500">or click to browse</p>
                </div>
              </div>
            )}
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={uploading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="text-xs text-gray-500">
            Supported formats: JPG, PNG, GIF, WebP (max 10MB)
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CloudflareImageUpload;