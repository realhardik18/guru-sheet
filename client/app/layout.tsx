import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { getAppConfig } from '@/lib/config';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GuruSheet",
  description:
    "Turn a textbook chapter into a print-ready, difficulty-tiered worksheet.",
  icons: {
    icon: "/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const configured = await getAppConfig();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
      data-theme="light"
    >
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className="app-shell flex h-dvh overflow-hidden">
        {configured && <Sidebar />}
        <div className="app-main flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
