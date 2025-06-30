import React from 'react';
interface CloudflareImageUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onImageSelect: (imageUrl: string) => void;
    selectedImageUrl?: string;
}
export declare const CloudflareImageUpload: React.FC<CloudflareImageUploadProps>;
export default CloudflareImageUpload;
