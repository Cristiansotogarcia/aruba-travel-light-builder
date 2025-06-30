import React from 'react';
interface CloudflareImageBrowserProps {
    isOpen: boolean;
    onClose: () => void;
    onImageSelect: (imageUrl: string) => void;
    selectedImageUrl?: string;
}
export declare const CloudflareImageBrowser: React.FC<CloudflareImageBrowserProps>;
export default CloudflareImageBrowser;
