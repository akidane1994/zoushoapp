'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { signOut } from 'next-auth/react';

// ★重要: ScannerをSSRなしで動的にインポート
const BarcodeScanner = dynamic(() => import('../../components/BarcodeScanner'), {
    ssr: false,
    loading: () => <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center">カメラ準備中...</div>
  });

// --- 型定義 ---
type BookData = {
  isbn: string;
  title: string;
  authors: string[];
  publishedDate: string;
  thumbnailUrl: string;
  source: 'GoogleBooks' | 'OpenBD';
};

export default function AdminPage() {
  // --- State管理 ---
  const [isbn, setIsbn] = useState<string>('');
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false); // 初期値falseに変更

  // --- 2. API呼び出し処理 (前回と同じ) ---
  const fetchBookData = useCallback(async (searchIsbn: string) => {
    if (!searchIsbn) return;
    
    setLoading(true);
    setError('');
    setBook(null);

    try {
      const res = await fetch(`/api/books?isbn=${searchIsbn}`);
      if (!res.ok) {
        throw new Error('書籍が見つかりませんでした');
      }
      const data: BookData = await res.json();
      setBook(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      // エラー時もカメラは止めない（再トライさせるため）
    } finally {
      setLoading(false);
    }
  }, []);

  // 検出時のハンドラ
  const handleDetected = (code: string) => {
    if (loading) return;

    setIsbn(code);
    setIsCameraActive(false); // スキャン完了したらカメラを閉じる
    fetchBookData(code);
  };

  // --- 登録処理 (Backend連携) ---
  const handleRegister = async () => {
    if (!book) return;
    if (!confirm(`「${book.title}」を登録しますか？`)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || '登録失敗');

      alert('登録完了！');
      // 次のためにリセット
      setBook(null);
      setIsbn('');
      // カメラ再起動したければここで startCamera()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラー');
    } finally {
      setLoading(false);
    }
  };

  // 手動検索用
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookData(isbn);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-800">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-blue-600">蔵書登録（Admin）</h1>
          <p className='text-xs text-gray-500'>管理者専用ページ</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login'})}
          className='text-sm text-gray-500 hover:text-red-600 underline decoration-dotted'
          >
            ログアウト
        </button>
      </header>

      <div className="max-w-md mx-auto space-y-4">

        {/* --- カメラエリア --- */}
        {!isCameraActive ? (
            <div className="bg-gray-200 h-48 rounded-lg flex flex-col items-center justify-center text-gray-500">
                 <p className="mb-2">カメラ停止中</p>
                <button
                    onClick={() => setIsCameraActive(true)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-blue-700 transition"
                >
                    カメラを起動
                </button>
            </div>
            ) : (
                <BarcodeScanner
                    onDetected={handleDetected}
                    onCancel={() => setIsCameraActive(false)}
                />
            )}
     </div>

        {/* --- 手動入力 & 結果 --- */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <form onSubmit={handleManualSearch} className="flex gap-2 mb-4">
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="ISBN入力"
              className="flex-1 border border-gray-300 rounded px-3 py-2"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-gray-600 text-white px-4 py-2 rounded text-sm"
            >
              検索
            </button>
          </form>

          {loading && <div className="text-center py-2 text-sm animate-pulse">処理中...</div>}
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

          {book && (
            <div className="border-t pt-4 mt-2">
              <div className="flex gap-3 mb-3">
                {book.thumbnailUrl && <img src={book.thumbnailUrl} alt="" className="w-16 h-24 object-cover bg-gray-200" />}
                <div>
                  <h3 className="font-bold text-sm">{book.title}</h3>
                  <p className="text-xs text-gray-600">{book.authors.join(', ')}</p>
                  <p className="text-xs text-gray-400 mt-1">{book.isbn}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                    onClick={() => { setBook(null);}}
                    className="flex-1 bg-gray-200 py-2 rounded text-sm"
                >
                    キャンセル
                </button>
                <button
                    onClick={handleRegister}
                    className="flex-1 bg-green-600 text-white py-2 rounded text-sm font-bold"
                >
                    登録する
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}