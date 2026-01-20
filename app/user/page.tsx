'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { signOut } from 'next-auth/react';

// --- スキャナーの動的インポート (SSR対策) ---
const BarcodeScanner = dynamic(() => import('../../components/BarcodeScanner'), {
  ssr: false,
  loading: () => <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center animate-pulse">カメラ起動中...</div>
});

// --- 型定義 ---
type Mode = 'borrow' | 'return' | null;
type Step = 'select' | 'scan' | 'confirm' | 'result';

type BookInfo = {
  isbn: string;
  title: string;
  authors: string[];
  thumbnailUrl?: string;
};

export default function UserPage() {
  // --- State管理 ---
  const [mode, setMode] = useState<Mode>(null);
  const [step, setStep] = useState<Step>('select');
  const [book, setBook] = useState<BookInfo | null>(null);

  // フォーム用State
  const [borrowerGroup, setBorrowerGroup] = useState('');

  // UI用State
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // --- 1. モード選択 ---
  const handleSelectMode = (selectedMode: Mode) => {
    setMode(selectedMode);
    setStep('scan');
    setError('');
    setMessage('');
    setBook(null);
  };

  // --- 2. スキャン完了後の処理 ---
  const handleDetected = async (code: string) => {
    // 読み込み済みなら無視
    if (book || loading) return;
    
    setLoading(true);
    try {
      // 本の情報を取得して表示 (確認用)
      const res = await fetch(`/api/books?isbn=${code}&type=inventory`);
      if (!res.ok) throw new Error('この本は蔵書登録されていません');
      
      const data = await res.json();
      setBook({
        isbn: data.isbn,
        title: data.title,
        authors: data.authors,
        thumbnailUrl: data.thumbnailUrl
      });
      
      setStep('confirm'); // 確認・入力画面へ
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      // スキャン画面のまま、エラーだけ出す
    } finally {
      setLoading(false);
    }
  };

  // --- 3. 確定処理 (貸出 or 返却) ---
  const handleSubmit = async () => {
    if (!book || !mode) return;
    
    // 貸出モードでのバリデーション
    if (mode === 'borrow' && (!borrowerGroup)) {
      setError('所属グループを入力してください');
      return;
    }

    if (!confirm(mode === 'borrow' ? 'この本を借りますか？' : 'この本を返却しますか？')) return;

    setLoading(true);
    setError('');

    try {
      const endpoint = '/api/lending';
      const method = mode === 'borrow' ? 'POST' : 'PUT';
      const body = mode === 'borrow' ? {
        isbn: book.isbn,
        title: book.title,
        borrowerGroup
      } : {
        isbn: book.isbn
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '処理に失敗しました');

      // 成功時の処理
      setMessage(mode === 'borrow' ? '貸出処理が完了しました！' : '返却処理が完了しました！');
      setStep('result');

    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラー');
    } finally {
      setLoading(false);
    }
  };

  // --- リセット処理 (最初に戻る) ---
  const handleReset = () => {
    setMode(null);
    setStep('select');
    setBook(null);
    setBorrowerGroup('');
    setMessage('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* ヘッダー */}
      <header className="bg-white shadow p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-700">図書貸出・返却</h1>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="bg-gray-100 text-gray-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-200 transition"
          >
            ログアウト
        </button>
      </header>

      <main className="p-4 max-w-md mx-auto">
        
        {/* --- Step 1: モード選択 --- */}
        {step === 'select' && (
          <div className="grid gap-4 mt-8">
            <button
              onClick={() => handleSelectMode('borrow')}
              className="bg-blue-600 text-white p-8 rounded-xl shadow-lg hover:bg-blue-700 transition flex flex-col items-center gap-2"
            >
              <span className="text-2xl font-bold">本を借りる</span>
              <span className="text-sm opacity-90">Borrow a Book</span>
            </button>
            
            <button
              onClick={() => handleSelectMode('return')}
              className="bg-green-600 text-white p-8 rounded-xl shadow-lg hover:bg-green-700 transition flex flex-col items-center gap-2"
            >
              <span className="text-2xl font-bold">本を返す</span>
              <span className="text-sm opacity-90">Return a Book</span>
            </button>
          </div>
        )}

        {/* --- Step 2: バーコードスキャン --- */}
        {step === 'scan' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold text-white ${mode === 'borrow' ? 'bg-blue-600' : 'bg-green-600'}`}>
                {mode === 'borrow' ? '貸出モード' : '返却モード'}
              </span>
              <p className="mt-2 text-gray-600">バーコードを読み取ってください</p>
            </div>

            {/* スキャナーコンポーネント */}
            <BarcodeScanner
              onDetected={handleDetected}
              onCancel={handleReset}
            />

            {error && <div className="p-3 bg-red-100 text-red-700 text-center rounded">{error}</div>}
            {loading && <div className="text-center animate-pulse text-gray-500">書籍情報を確認中...</div>}
          </div>
        )}

        {/* --- Step 3: 確認・入力フォーム --- */}
        {step === 'confirm' && book && (
          <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            
            {/* 書籍情報 */}
            <div className="flex gap-4 border-b pb-4">
              {book.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.thumbnailUrl} alt="" className="w-20 h-28 object-cover bg-gray-200 shadow" />
              ) : (
                <div className="w-20 h-28 bg-gray-200 flex items-center justify-center text-xs text-gray-500">No Image</div>
              )}
              <div>
                <h2 className="font-bold text-lg leading-tight mb-1">{book.title}</h2>
                <p className="text-sm text-gray-600">{book.authors.join(', ')}</p>
                <p className="text-xs text-gray-400 mt-1">{book.isbn}</p>
              </div>
            </div>

            {/* 貸出時のみ表示するフォーム */}
            {mode === 'borrow' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">所属グループ</label>
                  <input
                    type="text"
                    value={borrowerGroup}
                    onChange={(e) => setBorrowerGroup(e.target.value)}
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="例: 開発部"
                  />
                </div>
              </div>
            )}

            {/* 返却時のメッセージ */}
            {mode === 'return' && (
              <div className="p-3 bg-green-50 text-green-800 rounded text-center text-sm">
                この本を返却処理しますか？
              </div>
            )}

            {error && <div className="text-red-600 text-sm text-center">{error}</div>}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-200 py-3 rounded-lg font-bold text-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`flex-1 py-3 rounded-lg font-bold text-white shadow transition
                  ${mode === 'borrow' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}
                  ${loading ? 'opacity-50' : ''}
                `}
              >
                {loading ? '処理中...' : (mode === 'borrow' ? '借りる' : '返す')}
              </button>
            </div>
          </div>
        )}

        {/* --- Step 4: 完了画面 --- */}
        {step === 'result' && (
          <div className="bg-white p-8 rounded-lg shadow text-center space-y-6">
            <div className="text-5xl">✅</div>
            <h2 className="text-xl font-bold">{message}</h2>
            
            <p className="text-gray-500 text-sm">
              {mode === 'borrow' ? '返却期限は2週間後です。' : 'ありがとうございました。'}
            </p>

            <button
              onClick={handleReset}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow hover:bg-blue-700"
            >
              トップに戻る
            </button>
          </div>
        )}

      </main>
    </div>
  );
}