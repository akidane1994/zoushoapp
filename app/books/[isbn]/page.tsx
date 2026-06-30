'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import BookCover from '@/components/BookCover';

// --- 型定義 (一覧APIと同じ構造) ---
type LendingDetail = {
  dueAt: string;
  borrowerName: string;
};

type Book = {
  isbn: string;
  title: string;
  authors: string;
  genre?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  thumbnailUrl?: string;
  status: "available" | "lent";
  lendingDetail?: LendingDetail;
};

export default function BookDetailPage() {
  const params = useParams();
  const isbn = (params?.isbn as string) ?? "";

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isbn) return;
    // 簡易実装：一覧APIから該当ISBNを取得。
    // 出版社・概要などフル書誌が必要なら /api/books?isbn=... を併用してください。
    fetch("/api/books/list")
      .then((r) => {
        if (!r.ok) throw new Error("データの取得に失敗しました");
        return r.json();
      })
      .then((d: Book[]) => {
        const t = d.find((b) => b.isbn === isbn);
        if (t) setBook(t);
        else setError("指定された書籍が見つかりませんでした");
      })
      .catch(() => setError("エラーが発生しました"))
      .finally(() => setLoading(false));
  }, [isbn]);

  if (loading) {
    return (
      <AppShell title="蔵書一覧">
        <div className="text-muted animate-pulse">読み込み中...</div>
      </AppShell>
    );
  }

  if (error || !book) {
    return (
      <AppShell title="蔵書一覧">
        <div className="text-muted">
          {error || "書籍が見つかりません"}
          <Link href="/books" className="text-aoyagi underline ml-2">
            一覧に戻る
          </Link>
        </div>
      </AppShell>
    );
  }

  const lent = book.status === "lent";
  const meta: [string, string | undefined][] = [
    ["ISBN", book.isbn],
    ["出版社", book.publisher],
    ["出版年", book.publishedDate],
  ];

  return (
    <AppShell
      title={
        <span className="text-muted font-sans text-sm">
          蔵書一覧 ／ <span className="text-ink">{book.title}</span>
        </span>
      }
    >
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 max-w-5xl">
        {/* 左：書影＋状態 */}
        <div className="w-full lg:w-[280px] shrink-0">
          <BookCover
            title={book.title}
            src={book.thumbnailUrl}
            className="w-[200px] sm:w-[240px] lg:w-[280px] aspect-[5/7] rounded-[10px] shadow-xl mx-auto lg:mx-0"
          />
          <div className="mt-5 bg-surface border border-line rounded-2xl p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  lent ? "bg-yamabuki" : "bg-aoyagi"
                }`}
              />
              <span
                className={`font-bold ${lent ? "text-yamabuki" : "text-aoyagi"}`}
              >
                {lent ? "貸出中" : "貸出可能"}
              </span>
            </div>
            {lent ? (
              <div className="text-sm text-ink-soft space-y-1.5">
                <div>返却予定：{book.lendingDetail?.dueAt}</div>
                <div>利用者：{book.lendingDetail?.borrowerName}</div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted mb-4">
                  この本は現在、書架にあります。
                </p>
                <Link
                  href="/user"
                  className="block text-center bg-aoyagi text-white rounded-[10px] py-3 font-bold hover:bg-aoyagi-dark transition"
                >
                  この本を借りる
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 右：書誌情報 */}
        <div className="flex-1 min-w-0 pt-1">
          {book.genre && (
            <span className="inline-block bg-leaf-soft text-aoyagi rounded-full px-4 py-1.5 text-sm font-bold mb-4">
              {book.genre}
            </span>
          )}
          <h1 className="font-mincho text-3xl lg:text-[38px] leading-snug mb-3">
            {book.title}
          </h1>
          <div className="text-lg text-ink-soft mb-8">{book.authors}</div>

          {book.description && (
            <p className="text-[15px] leading-loose text-ink-soft max-w-2xl mb-8">
              {book.description}
            </p>
          )}

          <dl className="grid sm:grid-cols-2 gap-x-14 max-w-2xl">
            {meta
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between py-3.5 border-t border-line text-sm"
                >
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-ink text-right">{v}</dd>
                </div>
              ))}
          </dl>
        </div>
      </div>
    </AppShell>
  );
}
