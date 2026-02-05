'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, BookOpen, ArrowLeft, Calendar, User } from 'lucide-react';

// --- 型定義 ---
// APIのレスポンスに合わせて定義します
type LendingDetail = {
  dueAt: string;
  borrowerName: string;
};

type Book = {
  isbn: string;
  title: string;
  authors: string; // スプレッドシートからは文字列で来る想定
  thumbnailUrl?: string;
  status: 'available' | 'lent';
  lendingDetail?: LendingDetail;
};

export default function BookListPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- 1. データ取得 ---
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await fetch('/api/books/list');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setBooks(data);
        setFilteredBooks(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  // --- 2. 検索フィルタリング ---
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = books.filter((book) => {
      const titleMatch = book.title.toLowerCase().includes(term);
      const authorMatch = book.authors ? book.authors.toLowerCase().includes(term) : false;
      return titleMatch || authorMatch;
    });
    setFilteredBooks(filtered);
  }, [searchTerm, books]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-10">

    <div className='sticky top-0 z-10 bg-gray-50'>
      {/* ヘッダー */}
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/user" className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              蔵書一覧
            </h1>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            Total: {filteredBooks.length}
          </span>
        </div>
      </header>
      {/* 検索バー */}
      <div className='max-w-4xl mx-auto px-4 py-4'>
       <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
            placeholder="タイトル、著者名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
       </div>
      </div>
    </div>

      <main className="max-w-4xl mx-auto px-4 space-y-6">
        {/* ローディング表示 */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-xl shadow h-32 animate-pulse flex gap-4">
                <div className="w-20 bg-gray-200 rounded h-full"></div>
                <div className="flex-1 space-y-3 py-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 書籍リスト */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBooks.map((book) => (
              // Step 4で作る詳細ページへのリンク (今はクリックすると404になります)
              <Link 
                href={`/books/${book.isbn}`} 
                key={book.isbn}
                className="block bg-white rounded-xl shadow-sm hover:shadow-md transition duration-200 overflow-hidden border border-transparent hover:border-blue-200 group"
              >
                <div className="flex p-4 gap-4">
                  {/* 書影 */}
                  <div className="flex-shrink-0">
                    {book.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={book.thumbnailUrl} 
                        alt={book.title} 
                        className="w-20 h-28 object-cover rounded shadow-sm bg-gray-100"
                      />
                    ) : (
                      <div className="w-20 h-28 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* 情報エリア */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 leading-tight mb-1 line-clamp-2 group-hover:text-blue-600 transition">
                        {book.title}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {book.authors}
                      </p>
                    </div>

                    {/* ステータスバッジ */}
                    <div className="mt-3">
                      {book.status === 'available' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          🟢 貸出可
                        </span>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            🔴 貸出中
                          </span>
                          {/* 貸出詳細情報 */}
                          <div className="text-xs text-gray-500 flex flex-col gap-0.5 mt-1 bg-gray-50 p-1.5 rounded w-full">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> 返却: {book.lendingDetail?.dueAt}
                            </span>
                            <span className="flex items-center gap-1">
                                <User className="w-3 h-3" /> {book.lendingDetail?.borrowerName}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && filteredBooks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            条件に一致する書籍は見つかりませんでした
          </div>
        )}

      </main>
    </div>
  );
}