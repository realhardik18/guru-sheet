import type { Metadata } from "next";
import Script from "next/script";
import { Poppins } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { getAppConfig } from '@/lib/config';
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GuruSheet",
  description:
    "Turn a textbook chapter into a print-ready, difficulty-tiered worksheet.",
  icons: {
    icon: [{ url: "/guru-sheet-icon.png", type: "image/png" }],
    shortcut: "/guru-sheet-icon.png",
    apple: "/guru-sheet-icon.png",
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
      className={`${poppins.variable} h-full antialiased`}
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
