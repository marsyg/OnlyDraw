import type { Metadata , Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OnlyDraw — Collaborative Sketch Canvas & Diagramming",
  description:
    "Fast, real-time collaborative sketching and hand-drawn whiteboard canvas with AI-powered diagram generation.",
  icons: {
    icon: "/icon.png",
  },
  openGraph: {
    title: "OnlyDraw — Collaborative Sketch Canvas",
    description:
      "Fast, real-time collaborative sketching and hand-drawn whiteboard canvas with AI-powered diagram generation.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased `} >
        {children}
      </body>
    </html>
  );
}
