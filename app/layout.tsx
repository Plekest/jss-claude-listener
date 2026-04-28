import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "jss-claude-listener",
  description: "Weekly Claude ranking monitor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
