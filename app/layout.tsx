import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SARAL SAINI — AI/ML Systems Engineering",
  description:
    "Portfolio of Saral Saini. I build, deploy, and maintain production machine learning systems.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-mono antialiased bg-white text-black">
        {children}
      </body>
    </html>
  );
}
