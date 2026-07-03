// Cloudflare Images flexible-variant helpers.
// Product/content images are served from imagedelivery.net as `/<id>/public`
// (full size). With flexible variants enabled we can request a resized
// rendition instead, which cuts card-grid image weight dramatically.

const CF_IMAGE_RE = /^(https:\/\/imagedelivery\.net\/[^/]+\/[^/]+)\/[^/]+$/;

/**
 * Rewrite a Cloudflare Images URL to a resized flexible variant
 * (e.g. `/public` -> `/w=400`). Non-Cloudflare URLs pass through untouched.
 */
export function cfImageVariant(url: string, params: string): string {
  const m = url.match(CF_IMAGE_RE);
  return m ? `${m[1]}/${params}` : url;
}

/** Card-grid rendition: plenty for ~300-400px wide product cards. */
export const cardImage = (url: string) => cfImageVariant(url, 'w=400');
