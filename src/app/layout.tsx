import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "HNA Acadex - Learning Management System",
  description: "Your comprehensive learning management system for academic excellence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Note: CSP via meta tag has limitations - some directives like frame-ancestors only work via HTTP headers
  // frame-ancestors is set via next.config.mjs headers() instead
  // 'unsafe-inline' for script-src is needed for Next.js inline scripts
  // 'unsafe-inline' for style-src is needed for Tailwind CSS
  const isDev = process.env.NODE_ENV === 'development';
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || '';
  const normalizedApiUrl = configuredApiUrl.startsWith('http://')
    ? `https://${configuredApiUrl.slice('http://'.length)}`
    : configuredApiUrl;
  const apiOrigin = normalizedApiUrl
    ? (() => {
        try {
          return new URL(normalizedApiUrl).origin;
        } catch {
          return '';
        }
      })()
    : '';
  const connectSrc = [
    "'self'",
    'https://api.hna-acadex.com',
    'https://gateway.storjshare.io',
    ...(isDev ? ['http://localhost:8000', 'ws:'] : []),
    ...(apiOrigin ? [apiOrigin] : []),
  ]
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(' ');
  const frameSrc = ["'self'", 'blob:', 'https://gateway.storjshare.io'].join(' ');

  const cspContent = isDev
    // Development: Allow unsafe-eval for React Refresh/HMR
    ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src ${connectSrc}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src ${frameSrc};`
    // Production: unsafe-inline needed for Next.js inline scripts, frame-ancestors set via headers
    : `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src ${connectSrc}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src ${frameSrc};`;

  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={cspContent} />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
