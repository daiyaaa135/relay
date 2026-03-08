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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
  var logEndpoint = '/api/debug-log';

  function send(payload) {
    try {
      fetch(logEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(function () {});
    } catch (e) {
      // swallow
    }
  }

  window.addEventListener('error', function (event) {
    send({
      id: 'log_' + Date.now() + '_preinit_error',
      runId: 'pre-fix',
      hypothesisId: 'H-preinit-js-error',
      location: 'app/layout.tsx:beforeInteractive',
      message: 'global_error_before_app_init',
      data: {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      timestamp: Date.now(),
    });
  });

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    send({
      id: 'log_' + Date.now() + '_preinit_rejection',
      runId: 'pre-fix',
      hypothesisId: 'H-preinit-js-error',
      location: 'app/layout.tsx:beforeInteractive',
      message: 'unhandledrejection_before_app_init',
      data: {
        reason:
          reason && typeof reason === 'object'
            ? {
                name: reason.name,
                message: reason.message,
                stack: reason.stack,
              }
            : String(reason),
      },
      timestamp: Date.now(),
    });
  });
})();`,
          }}
        />
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
