import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Si Her DeFi Certification",
  description: "DeFi, taught by the people leading it.",
  // Si Her DeFi crystal on the brand gradient (public/icon.svg, with PNG fallbacks)
  icons: {
    icon: [
      { url: "/siherdefi/icon.svg", type: "image/svg+xml" },
      { url: "/siherdefi/icon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/siherdefi/apple-icon.png",
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

