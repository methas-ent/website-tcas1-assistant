/** @type {import('next').NextConfig} */

/**
 * Derive the allowed next/image remote host from R2_COVERS_PUBLIC_BASE_URL
 * (e.g. https://pub-xxxxx.r2.dev) so the optimizer only trusts the R2 covers
 * host — never all remote domains.
 *
 * Returns an empty list when the env var is missing or unparseable: LOCAL
 * covers are served same-origin via /api/media/covers and need no remote
 * pattern, so failing safe here just means no external host is trusted.
 */
function coverImageRemotePatterns() {
  const baseUrl = process.env.R2_COVERS_PUBLIC_BASE_URL?.trim();

  if (!baseUrl) {
    return [];
  }

  try {
    const { protocol, hostname } = new URL(baseUrl);

    return [
      {
        protocol: protocol.replace(/:$/, ""),
        hostname,
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
    serverActions: {
      bodySizeLimit: "512mb",
    },
  },
  images: {
    remotePatterns: coverImageRemotePatterns(),
  },
};

export default nextConfig;
