// app/layout.tsx (例)
import type {Metadata} from "next";
import { Shippori_Mincho, Noto_Sans_JP} from "next/font/google";
import "./globals.css";
import { Providers } from './providers'; // ★作成したファイルをインポート

// 見出し用：明朝体で「文庫」らしい上質さ
const mincho = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-shippori",
  display: "swap",
});

// 本文・UI用：可読性の高いゴシック
const noto = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "青柳文庫",
  description: "社内蔵書管理システム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${noto.variable} ${mincho.variable}`}>
      <body className="bg-paper text-ink font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
