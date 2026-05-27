import type { Metadata } from "next";
import { AdminPreferenceControls } from "@/components/admin/AdminPreferenceControls";
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
    <html lang="th" data-admin-language="th" data-admin-theme="light">
      <body
        className="min-h-screen bg-surface-soft pb-16 font-sans text-ink antialiased transition-colors duration-300 lg:pb-0"
        data-admin-language="th"
        data-admin-shell
        data-admin-theme="light"
      >
        {children}
        <AdminPreferenceControls />
      </body>
    </html>
  );
}
