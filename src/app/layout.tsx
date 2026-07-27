// VIEW LAYER — root layout.
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: `${brand.name} — Learn, build, ship`,
  description:
    "A friendly CI/CD classroom. Students get instant feedback on every push, teachers grade with real pipeline results, and IT keeps the lab running.",
};

/**
 * Browser and OS chrome pick up the brand colour (mobile address bar, PWA
 * splash). This is the ONE place a colour is repeated outside globals.css:
 * Next needs a literal string here, and CSS variables are not resolved when
 * the value is written into <meta>. Keep it in step with --brand-600.
 */
export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
