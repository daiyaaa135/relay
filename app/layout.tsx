import type { Metadata, Viewport } from "next";
import "./globals.css";
import Layout from "./components/Layout";

export const metadata: Metadata = {
  title: "Rellaey: Gadget Swapping Marketplace",
  description: "A high-end, credit-based gadget swapping marketplace for tech enthusiasts.",
};

/** Prevent zoom on list/camera steps; viewport-fit=cover enables env(safe-area-inset-*) for Dynamic Island/notch. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#FF5721" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased bg-relay-bg text-relay-text"
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__SUPABASE_PUBLIC_ENV__=${JSON.stringify({
              url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
              anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            })};`,
          }}
        />
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
