import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Polski Magazyn Broni", template: "%s | Polski Magazyn Broni" },
  description: "Lokalna ewidencja broni i amunicji.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
