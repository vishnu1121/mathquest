import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "MathQuest",
  description: "An adaptive math adventure where the forest grows as you learn.",
  applicationName: "MathQuest",
};

export const viewport: Viewport = {
  themeColor: "#f1f8f3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // Browser extensions often add attributes to <html> and <body> before React hydrates (for example
    // data-tsenta-overlay-*). This only silences attribute mismatches on these two tags, not their children.
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
