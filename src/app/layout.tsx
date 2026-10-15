import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { SHARE_IMAGE } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Where the app is served, for absolute links in link previews (og:image must be a full URL). */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Si Her DeFi Certification",
  description: "DeFi, taught by the people leading it.",
  // Si Her DeFi crystal on the brand gradient (public/icon.svg). PNG and .ico come
  // first: link previews (Slack, Asana, WhatsApp…) skip SVG icons
  icons: {
    icon: [
      { url: "/siherdefi/favicon.ico", sizes: "48x48" },
      { url: "/siherdefi/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/siherdefi/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/siherdefi/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/siherdefi/apple-icon.png",
  },
  // The card shown when a link is shared. No og:title, so each page's own title is used
  openGraph: {
    type: "website",
    siteName: "Si Her DeFi",
    description: "DeFi, taught by the people leading it.",
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    images: [SHARE_IMAGE.url],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

