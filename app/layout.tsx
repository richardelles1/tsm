import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "The Shared Mile",
  description:
    "Movement unlocks capital. A marketplace where verified activity activates funding for nonprofits.",
  openGraph: {
    title: "The Shared Mile",
    description: "Movement unlocks capital.",
    url: "https://thesharedmile.com",
    siteName: "The Shared Mile",
    images: [
      {
        url: "/coming-soon-hero.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Shared Mile",
    description: "Movement unlocks capital.",
    images: ["/coming-soon-hero.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div>{children}</div>
      </body>
    </html>
  );
}