/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    // BLAZE ECOM product images are served from imgix (verified hosts:
    // tymber-blaze-d2-products.imgix.net, tymber-s3-qa.imgix.net). Only used when
    // CATALOG_SOURCE=blaze — the mock catalog's local /public/products images don't
    // need remotePatterns.
    remotePatterns: [{ protocol: 'https', hostname: '**.imgix.net' }],
  },

  // Search engines must not index this preview. It carries a licensed retailer's
  // real branding, address and prices, and an indexed result pointing here could
  // be taken for their actual storefront.
  //
  // This lives here rather than in netlify.toml because Netlify's [[headers]]
  // apply at the CDN layer only: static files receive them, but responses
  // rendered by the Next.js runtime — every actual page — do not. Verified
  // against the live deploy, where /robots.txt carried the header and / did not.
  //
  // robots.txt alone is not sufficient either: it prevents crawling, not
  // indexing. A page it blocks can still be listed as a bare URL if discovered
  // through a link elsewhere.
  //
  // Opt out deliberately with ALLOW_INDEXING=true if this ever becomes the
  // client's real, AGCO-submitted storefront.
  async headers() {
    if (process.env.ALLOW_INDEXING === 'true') return [];
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
    ];
  },
};

export default nextConfig;
