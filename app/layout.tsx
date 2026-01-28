import type { Metadata } from "next";
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

  return (
    <html lang="en">
      <body className="antialiased">
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
