import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import Header from "@/components/Header";
import QuickActionBar from "@/components/QuickActionBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "East Lothian Online",
  description: "Local events, deals and updates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-white text-black">
        <Header />

        <div className="pb-28 md:pb-0">
          {children}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white p-4 md:hidden">
          <QuickActionBar />
        </div>

        <Analytics />
      </body>
    </html>
  );
}