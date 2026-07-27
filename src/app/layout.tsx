import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "nomadly | 仕事がはかどる場所を見つけよう",
  description: "Wi-Fi・電源・静けさから、あなたにぴったりのワークカフェを探せます。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
