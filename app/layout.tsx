import type { Metadata, Viewport } from "next";
import "../styles/globals.css";
import AppNav from "@/components/AppNav";

export const metadata: Metadata = {
  metadataBase: new URL("https://thesharedmile.com"),
  title: "The Shared Mile",
  description:
    "Movement unlocks capital. A marketplace where verified activity activates funding for nonprofits.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "The Shared Mile",
  },
  openGraph: {
    title: "The Shared Mile",
    description: "Movement unlocks capital.",
    url: "https://thesharedmile.com",
    siteName: "The Shared Mile",
    images: [{ url: "/coming-soon-hero.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Shared Mile",
    description: "Movement unlocks capital.",
    images: ["/coming-soon-hero.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#070A12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#070A12]">
        <AppNav />
        <div>{children}</div>
      </body>
    </html>
  );
}
