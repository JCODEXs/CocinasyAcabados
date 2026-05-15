import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { Navbar } from "./_components/Navbar";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  // Basic metadata
  title: {
    default: "Kitchen Quote App | Get Professional Kitchen Renovation Quotes",
    template: "%s | Kitchen Quote App",
  },
  description: "Get accurate, personalized quotes for your dream kitchen renovation. Compare prices, materials, and designs from top kitchen specialists. Start your kitchen transformation today!",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <SessionProvider>

        <TRPCReactProvider> <Navbar/>{children}</TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
