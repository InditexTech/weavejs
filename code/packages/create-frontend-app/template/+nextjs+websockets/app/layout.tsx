import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";

const notoSans = Noto_Sans({
  preload: true,
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

const notoSansMono = Noto_Sans_Mono({
  preload: true,
  variable: "--font-noto-sans-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Also supported but less commonly used
  // interactiveWidget: 'resizes-visual',
};

export const metadata: Metadata = {
  title: "WeaveJS Playground",
  description: "This is a playground for WeaveJS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${notoSans.variable} ${notoSansMono.variable} antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
