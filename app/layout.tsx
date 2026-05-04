
import type { Metadata, Viewport } from "next";
//import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
//import Script from "next/script";
/*
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
*/
export const metadata: Metadata = { 
  title: {
    default: "Skyltjakten",
    template: "%s | Skyltjakten",
  },
  alternates:{
    canonical: "https://skyltjakten.vercel.app"
  },
  description: "001-999-utmaning med statistik och social progression.",
  applicationName: "Skyltjakten",
  appleWebApp: {
    capable: true,
    title: "Skyltjakten",
    statusBarStyle: "black-translucent",
    startupImage:
    [
      {
      url: "/splash/splash-1170x2532.png",
      media:
        "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    },
    {
      url: "/splash/splash-1179x2556.png",
      media:
        "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    },
    {
      url: "/splash/splash-1290x2796.png",
      media:
        "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    },
    {
      url: "/splash/splash-1284x2778.png",
      media:
        "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    },
    {
      url: "/splash/splash-1125x2436.png",
      media:
        "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    },
  ],
   
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "Skyltjakten",
    description:
      "Ett socialt spel där du jagar registreringsskyltar från 001 till 999.",
    siteName: "Skyltjakten",
    url:"https://skyltjakten.vercel.app",
    locale: "sv_SE",
    type: "website",
  },
  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className="min-h-full flex flex-col select-none scroll-smooth touch-pan-y">
        {children}
        
      </body>
      
    </html>
  );
}
