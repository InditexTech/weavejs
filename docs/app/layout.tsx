import "./global.css";
import { RootProvider } from "fumadocs-ui/provider";
import { Noto_Sans } from "next/font/google";
import type { ReactNode } from "react";

const inter = Noto_Sans({
  subsets: ["latin"],
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider search={{ options: { type: "static" } }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
