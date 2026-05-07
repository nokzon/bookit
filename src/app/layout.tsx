import type { Metadata } from "next";
import { Livvic } from "next/font/google";
import "./globals.css";

const livvic = Livvic({
  variable: "--font-livvic",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bookit",
  description: "Scan, save, and compare books.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${livvic.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
