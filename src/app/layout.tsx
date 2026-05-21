import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "VDO Learning Platform",
  description: "คอร์สเรียนวิดีโอออนไลน์",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-surface-soft font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
