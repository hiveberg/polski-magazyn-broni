import type { Metadata } from "next";
import {
  PRODUCT_FULL_NAME,
  PRODUCT_SHORT_NAME,
  PRODUCT_WEBSITE_URL,
} from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCT_WEBSITE_URL),
  applicationName: PRODUCT_SHORT_NAME,
  title: { default: PRODUCT_FULL_NAME, template: `%s | ${PRODUCT_SHORT_NAME}` },
  description: "Lokalna ewidencja broni palnej i amunicji.",
  openGraph: {
    type: "website",
    url: PRODUCT_WEBSITE_URL,
    siteName: PRODUCT_SHORT_NAME,
    title: PRODUCT_FULL_NAME,
    description: "Lokalna ewidencja broni palnej i amunicji.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
