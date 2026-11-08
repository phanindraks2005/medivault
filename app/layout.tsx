import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Link-preview images and URLs are made absolute against the live site.
  metadataBase: new URL("https://medivault-ks.vercel.app"),
  title: {
    default: "MediVault: your family's health, dated and in one place",
    template: "%s · MediVault",
  },
  description:
    "Keep every family member's prescriptions, lab reports, vaccinations and allergies in one place. MediVault reads prescriptions for you and shows what's due next.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable} h-full antialiased`}>
      <head>
        <noscript>
          <style>{`[style^="opacity:0;"],[style="opacity:0"]{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
