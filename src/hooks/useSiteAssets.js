import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
const SiteAssetsContext = createContext(undefined);
export const useSiteAssets = () => {
    const ctx = useContext(SiteAssetsContext);
    if (!ctx)
        throw new Error('useSiteAssets must be used within SiteAssetsProvider');
    return ctx;
};
export const SiteAssetsProvider = ({ children }) => {
    const [assets, setAssets] = useState({});
    const fetchAssets = async () => {
        const { data, error } = await supabase
            .from('content_images')
            .select('image_key, file_path')
            .in('image_key', ['hero_image', 'logo', 'favicon']);
        const { data: titleData } = await supabase
            .from('content_blocks')
            .select('content')
            .eq('block_key', 'site_title')
            .single();
        if (!error && data) {
            const result = {};
            data.forEach(({ image_key, file_path }) => {
                const path = file_path.startsWith(`${image_key}/`) ? file_path : `${image_key}/${file_path}`;
                const { data: url } = supabase.storage
                    .from('site-assets')
                    .getPublicUrl(path);
                result[image_key] = url.publicUrl;
            });
            if (titleData?.content) {
                result.title = titleData.content;
            }
            setAssets(result);
        }
    };
    useEffect(() => {
        fetchAssets();
    }, []);
    useEffect(() => {
        if (assets.favicon) {
            const link = document.querySelector("link[rel*='icon']");
            if (link && link.href !== assets.favicon)
                link.href = assets.favicon;
        }
    }, [assets.favicon]);
    useEffect(() => {
        if (assets.title) {
            document.title = assets.title;
            const og = document.querySelector("meta[property='og:title']");
            if (og)
                og.setAttribute('content', assets.title);
        }
    }, [assets.title]);
    return (_jsx(SiteAssetsContext.Provider, { value: { assets, refresh: fetchAssets }, children: children }));
};
