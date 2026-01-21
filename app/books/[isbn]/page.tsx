'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, User, BookOpen, AlertCircle } from 'lucide-react';

// --- 型定義 (一覧APIと同じ構造) ---
type LendingDetail = {
  dueAt: string;
  borrowerName: string;
};

type Book = {
  isbn: string;
  title: string;
  authors: string;
  thumbnailUrl?: string;
  status: 'available' | 'lent';
  lendingDetail?: LendingDetail;
};

export default function BookDetailPage() {
  const params = useParams();
  const isbn = params?.isbn as string;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- データ取得 ---
  // 今回は簡易実装として、一覧API(/api/books/list)から全件取得して
  // フロント側で該当ISBNを探す方式をとります。
  // (本格運用で件数が増えた場合は、個別取得APIを作ると良いでしょう)
  useEffect(() => {
    if (!isbn) return;

    const fetchBook = async () => {
      try {
        const res = await fetch('/api/books/list');
        if (!res.ok) throw new Error('データの取得に失敗しました');
        
        const data: Book[] = await res.json();
        
        // ISBNで検索 (ハイフンありなし等の正規化は今は割愛し、完全一致または部分一致)
        const target = data.find((b) => b.isbn === isbn);
        
        if (target) {
          setBook(target);
        } else {
          setError('指定された書籍が見つかりませんでした');
        }
      } catch (err) {
        setError('エラーが発生しました');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [isbn]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500 font-bold">読み込み中...</div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center space-y-4">
        <div className="bg-red-100 p-4 rounded-full">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <p className="text-gray-800 font-bold">{error || '書籍が見つかりません'}</p>
        <Link href="/books" className="text-blue-600 hover:underline">
          一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-10">
      
      {/* ヘッダー */}
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/books" className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-gray-800 truncate">
            {book.title}
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-6">
        
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* 上部: 書影と基本情報 */}
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-8 border-b border-gray-100">
            {/* 書影 (大きめに表示) */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              {book.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={book.thumbnailUrl} 
                  alt={book.title} 
                  className="w-40 h-56 object-cover rounded-lg shadow-md bg-gray-200"
                />
              ) : (
                <div className="w-40 h-56 bg-gray-200 rounded-lg flex items-center justify-center flex-col gap-2 text-gray-400 shadow-inner">
                  <BookOpen className="w-8 h-8" />
                  <span className="text-xs">No Image</span>
                </div>
              )}
            </div>

            {/* タイトル・著者・ISBN */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <h2 className="text-2xl font-bold text-gray-800 leading-tight">
                {book.title}
              </h2>
              <p className="text-gray-600 text-lg">
                {book.authors}
              </p>
              <div className="inline-block bg-gray-100 px-3 py-1 rounded text-sm text-gray-500 font-mono">
                ISBN: {book.isbn}
              </div>
            </div>
          </div>

          {/* 下部: 貸出ステータス */}
          <div className="p-6 sm:p-8 bg-gray-50/50">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              現在の状況
            </h3>

            {book.status === 'available' ? (
              // 貸出可能な場合
              <div className="bg-white border border-green-200 rounded-xl p-6 flex flex-col items-center text-center gap-3 shadow-sm">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🟢</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-800">貸出可能です</p>
                  <p className="text-sm text-green-600 mt-1">
                    この本は現在、書架にあります。
                  </p>
                </div>
                <Link 
                  href="/user" 
                  className="mt-2 bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow"
                >
                  借りに行く
                </Link>
              </div>
            ) : (
              // 貸出中の場合
              <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4 text-red-700">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <span className="font-bold text-lg">貸出中</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase mb-1">
                      <Calendar className="w-4 h-4" /> 返却予定日
                    </div>
                    <p className="text-xl font-bold text-gray-800">
                      {book.lendingDetail?.dueAt}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase mb-1">
                      <User className="w-4 h-4" /> 利用者
                    </div>
                    <p className="text-lg font-bold text-gray-800 truncate">
                      {book.lendingDetail?.borrowerName}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}