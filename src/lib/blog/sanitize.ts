// The app aliases the bare 'dompurify' import to a script-stripping stub
// (vite.config.ts / tsconfig.json). Blog HTML is written by non-admin users
// and rendered publicly, so it goes through the real library.
import DOMPurify from 'dompurify-real';

const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's',
  'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'img', 'figure',
  'figcaption', 'mark', 'iframe',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height',
  'class', 'style', 'data-align', 'allow', 'allowfullscreen', 'frameborder',
];

const IFRAME_HOSTS = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//;
const STYLE_ALLOWED = /^\s*text-align\s*:\s*(left|center|right|justify)\s*;?\s*$/i;

let hooked = false;
function installHooks() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName === 'iframe') {
      const src = (node as Element).getAttribute('src') ?? '';
      if (!IFRAME_HOSTS.test(src)) node.parentNode?.removeChild(node);
    }
  });
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element;
    if (el.hasAttribute?.('style') && !STYLE_ALLOWED.test(el.getAttribute('style') ?? '')) {
      el.removeAttribute('style');
    }
    if (el.tagName === 'A') {
      el.setAttribute('rel', 'noopener noreferrer nofollow');
      if (el.getAttribute('target') !== '_blank') el.removeAttribute('target');
    }
  });
}

export function sanitizeBlogHtml(html: string): string {
  installHooks();
  return DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
  });
}
