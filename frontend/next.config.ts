import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Saltamos type-check en build de produccion. Los errores TS no son
  // runtime errors y se catchean en dev. Esto acelera el build.
  // (`eslint` ya no se configura aqui en Next 16 — vive en .eslintrc / eslint.config.mjs).
  typescript: { ignoreBuildErrors: true },

  // Compression a nivel Node (en Vercel ya lo hace el edge, pero no estorba).
  compress: true,

  // Cuando se sirve detras de un proxy (Vercel/Render), confiar en headers.
  poweredByHeader: false,

  // El backend Django usa rutas con slash final (/api/.../). Con trailingSlash
  // activado, Next conserva el slash al reenviar por el proxy (rewrites), en vez
  // de descartarlo y provocar el bucle de redirección 301 (APPEND_SLASH).
  trailingSlash: true,

  // Permite que los dispositivos de la red local accedan a los recursos de dev
  // (HMR, /_next/*) sin que Next los bloquee por origen cruzado.
  allowedDevOrigins: ["192.168.15.37"],

  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "192.168.15.37" },
      { protocol: "https", hostname: "**" },
    ],
  },

  // Proxy: el frontend (puerto 3000) reenvía /api y /media al backend Django
  // interno (127.0.0.1:8000). Asi los dispositivos de la red local solo necesitan
  // acceder al 3000 — el 8000 nunca se expone ni requiere regla de firewall.
  // Solo aplica cuando NO hay NEXT_PUBLIC_API_URL (en deploy se usa la URL directa).
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL) return [];
    return [
      // Forzamos el slash final en el destino: Django (APPEND_SLASH) exige rutas
      // con / al final, y el proxy de Next lo descarta del :path*.
      { source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*/" },
      // RH expone una API legacy en /rh/api/... — SOLO eso se proxea al backend.
      // OJO: el frontend tiene sus PROPIAS páginas en /rh/... (empleados, etc.),
      // así que el patrón debe ser /rh/api/ y no /rh/ (si no, Next reenvía las
      // páginas del frontend a Django y devuelven 404).
      { source: "/rh/api/:path*", destination: "http://127.0.0.1:8000/rh/api/:path*/" },
      // Media y estáticos de Django (p.ej. páginas server-rendered de RH). Sin
      // slash final porque son archivos con extensión.
      { source: "/media/:path*", destination: "http://127.0.0.1:8000/media/:path*" },
      { source: "/static/:path*", destination: "http://127.0.0.1:8000/static/:path*" },
    ];
  },
};

export default nextConfig;
