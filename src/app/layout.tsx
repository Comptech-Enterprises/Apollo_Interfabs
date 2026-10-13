import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} - ${site.product}`, template: `%s - ${site.name}` },
  description: site.description,
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false }, // private business data
  applicationName: `${site.name} ${site.product}`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2456c7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body className="min-h-dvh" suppressHydrationWarning>
        <NavigationProgressBar />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
