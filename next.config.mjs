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
};

export default nextConfig;
