import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "OMM",
  description: "Oriva Movement Marketplace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="omm-shell">{children}</div>
      </body>
    </html>
  );
}
