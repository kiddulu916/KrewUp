import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { Analytics } from "@vercel/analytics/next";
import { ConsentBanner, AdScripts } from "@/components/ads";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CsrfProvider } from "@/components/providers/csrf-provider";
import { getOrCreateCsrfToken } from "@/lib/security/csrf";
import { SkipLink } from "@/components/ui/skip-link";

export const metadata: Metadata = {
  title: "KrewUp - Connecting Skilled Trade Workers with Employers",
  description: "The premier job marketplace for skilled trade workers and contractors",
  icons: { icon: "/logo.png" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const csrfToken = await getOrCreateCsrfToken();
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  return (
    <html lang="en">
      <head>
        <meta name="google-adsense-account" content={adsenseClientId} />
      </head>
      <body className="antialiased">
        <Script async id="google-consent-init" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', {
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'analytics_storage': 'denied',
              'wait_for_update': 500,
            });
          `}
        </Script>
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          id="google-adsense"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <SkipLink />
        <QueryProvider>
          <ToastProvider>
            <CsrfProvider token={csrfToken}>
              <SpeedInsights />
              <main id="main-content" tabIndex={-1}>
                {children}
              </main>
              <Analytics />
              <ConsentBanner />
              <AdScripts />
            </CsrfProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
