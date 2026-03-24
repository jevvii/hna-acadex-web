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
  // Environment-conditional CSP: development allows unsafe-eval for React Refresh/HMR
  const cspContent = process.env.NODE_ENV === 'development'
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://api.hna-acadex.com http://localhost:8000; object-src 'none'; base-uri 'self'; form-action 'self';"
    : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://api.hna-acadex.com; object-src 'none'; base-uri 'self'; form-action 'self';";

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
