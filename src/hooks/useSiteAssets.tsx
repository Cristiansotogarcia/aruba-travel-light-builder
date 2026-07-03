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

// Cache resolved asset URLs so returning visitors paint the hero/logo immediately
// instead of waiting for two DB round-trips (stale-while-revalidate).
const ASSETS_CACHE_KEY = 'tla-site-assets-v1';

const readCachedAssets = (): SiteAssets => {
  try {
    return JSON.parse(localStorage.getItem(ASSETS_CACHE_KEY) || '{}') as SiteAssets;
  } catch {
    return {};
  }
};

export const useSiteAssets = () => {
  const ctx = useContext(SiteAssetsContext);
  if (!ctx) throw new Error('useSiteAssets must be used within SiteAssetsProvider');
  return ctx;
};

export const SiteAssetsProvider = ({ children }: { children: ReactNode }) => {
  const [assets, setAssets] = useState<SiteAssets>(readCachedAssets);

  const fetchAssets = async () => {
    const [{ data, error }, { data: titleData }] = await Promise.all([
      supabase
        .from('content_images')
        .select('image_key, file_path')
        .in('image_key', ['hero_image', 'logo', 'favicon']),
      supabase
        .from('content_blocks')
        .select('content')
        .eq('block_key', 'site_title')
        .single(),
    ]);

    if (!error && data) {
      const result: SiteAssets = {};
      data.forEach(({ image_key, file_path }) => {
        const path = file_path.startsWith(`${image_key}/`) ? file_path : `${image_key}/${file_path}`;
        const { data: url } = supabase.storage
          .from('site-assets')
          .getPublicUrl(path);
        (result as any)[image_key] = url.publicUrl;
      });
      if (titleData?.content) {
        result.title = titleData.content as string;
      }
      setAssets(result);
      try {
        localStorage.setItem(ASSETS_CACHE_KEY, JSON.stringify(result));
      } catch {
        // storage full/blocked — cache is best-effort only
      }
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    if (assets.favicon) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (link && link.href !== assets.favicon) link.href = assets.favicon;
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
