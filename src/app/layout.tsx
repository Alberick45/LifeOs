import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "HumanOS",
  description: "Relationship Intelligence Platform",
  manifest: "/manifest.json",
  themeColor: "#8b5cf6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HumanOS"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        
        <Script id="pwa-sw" strategy="afterInteractive" dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              if (document.readyState === 'complete') {
                navigator.serviceWorker.register('/sw.js');
              } else {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            }
          `
        }} />
      </body>
    </html>
  );
}
