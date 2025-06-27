import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

const SiteAssetsContext = createContext<SiteAssetsContextType | undefined>(undefined);

export const useSiteAssets = () => {
  const ctx = useContext(SiteAssetsContext);
  if (!ctx) throw new Error('useSiteAssets must be used within SiteAssetsProvider');
  return ctx;
};

export const SiteAssetsProvider = ({ children }: { children: ReactNode }) => {
  const [assets, setAssets] = useState<SiteAssets>({});

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
      const result: SiteAssets = {};
      data.forEach(({ image_key, file_path }) => {
        const { data: url } = supabase.storage
          .from('site-assets')
          .getPublicUrl(`${image_key}/${file_path}`);
        (result as any)[image_key] = url.publicUrl;
      });
      if (titleData?.content) {
        result.title = titleData.content as string;
      }
      setAssets(result);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    if (assets.favicon) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (link) link.href = assets.favicon;
    }
  }, [assets.favicon]);

  useEffect(() => {
    if (assets.title) {
      document.title = assets.title;
      const og = document.querySelector("meta[property='og:title']") as HTMLMetaElement | null;
      if (og) og.setAttribute('content', assets.title);
    }
  }, [assets.title]);

  return (
    <SiteAssetsContext.Provider value={{ assets, refresh: fetchAssets }}>
      {children}
    </SiteAssetsContext.Provider>
  );
};
