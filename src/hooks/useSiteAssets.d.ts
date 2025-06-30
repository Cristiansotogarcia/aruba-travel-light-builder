import { ReactNode } from 'react';
interface SiteAssets {
    hero_image?: string;
    logo?: string;
    favicon?: string;
    title?: string;
}
interface SiteAssetsContextType {
    assets: SiteAssets;
    refresh: () => Promise<void>;
}
export declare const useSiteAssets: () => SiteAssetsContextType;
export declare const SiteAssetsProvider: ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export {};
