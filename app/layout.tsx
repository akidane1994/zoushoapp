// app/layout.tsx (例)
import './globals.css';
import { Providers } from './providers'; // ★作成したファイルをインポート

export const metadata = {
  title: '蔵書管理アプリ',
  description: '社内用蔵書管理システム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {/* ★Providersでラップする */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}