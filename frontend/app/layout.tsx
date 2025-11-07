import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import CallManager from "./components/CallManager";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SwapIt",
  description: "Skill swapping platform",
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <CallManager />
        {children}
      </body>
    </html>
  );
}
