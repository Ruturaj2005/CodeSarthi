import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CodeSarthi — Understand any codebase visually",
  description:
    "CodeSarthi turns GitHub repositories into interactive visual learning experiences with AI explanations in Hindi, Tamil, Telugu and 5 more Indian languages. Built for Bharat.",
  keywords: ["codebase", "visualization", "AI", "learning", "GitHub", "India", "Hindi", "open source"],
  openGraph: {
    title: "CodeSarthi",
    description: "Koi bhi codebase samjho — visually, in your language.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} antialiased bg-[#0A0A0F] text-[#E8E8F0]`}>
        {children}
      </body>
    </html>
  );
}
