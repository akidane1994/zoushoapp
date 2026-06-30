'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import BookCover from '@/components/BookCover';

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
  genre?: string;
  thumbnailUrl?: string;
  status: 'available' | 'lent';
  lendingDetail?: LendingDetail;
};

const GENRES = ["すべて", "技術", "ビジネス", "教養", "デザイン", "自己啓発"];

export default function BookListPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("すべて");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<"new" | "title">("new");

  useEffect(() => {
    fetch("/api/books/list")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((d: Book[]) => setBooks(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    let list = books.filter((b) => {
      const hit =
        b.title.toLowerCase().includes(term) ||
        (b.authors ?? "").toLowerCase().includes(term);
      const g = genre === "すべて" || b.genre === genre;
      const s = !availableOnly || b.status === "available";
      return hit && g && s;
    });
    if (sort === "title") {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title, "ja"));
    }
    return list;
  }, [books, q, genre, availableOnly, sort]);

  return (
    <AppShell
      title={
        <span className="flex items-baseline gap-3">
          蔵書一覧
          <span className="font-sans text-sm text-muted">{books.length}冊</span>
        </span>
      }
    >
      {/* ツールバー：検索・並び替え・絞り込み */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="タイトル・著者で検索"
          className="flex-1 min-w-[240px] max-w-md bg-surface border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:border-aoyagi transition"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "new" | "title")}
          className="bg-surface border border-line rounded-lg px-4 py-2.5 text-sm text-ink-soft"
        >
          <option value="new">新着順</option>
          <option value="title">タイトル順</option>
        </select>
        <button
          onClick={() => setAvailableOnly((v) => !v)}
          className={`rounded-full px-4 py-2 text-sm border transition ${
            availableOnly
              ? "bg-aoyagi text-white border-aoyagi"
              : "bg-surface text-ink-soft border-line"
          }`}
        >
          貸出可のみ
        </button>
      </div>

      {/* ジャンルチップ */}
      <div className="flex flex-wrap gap-2 mb-7">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={`rounded-full px-5 py-1.5 text-sm border transition ${
              genre === g
                ? "bg-aoyagi text-white border-aoyagi font-bold"
                : "bg-surface text-ink-soft border-line hover:border-aoyagi/40"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* グリッド */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface border border-line rounded-xl p-3">
              <div className="aspect-[3/4] rounded-md bg-line animate-pulse" />
              <div className="h-4 bg-line rounded mt-3 w-3/4 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((b) => (
            <Link
              key={b.isbn}
              href={`/books/${b.isbn}`}
              className="group bg-surface border border-line rounded-xl p-3 hover:shadow-md transition"
            >
              <BookCover
                title={b.title}
                src={b.thumbnailUrl}
                className="aspect-[3/4] w-full rounded-md shadow-sm"
              />
              <div className="mt-3">
                <div className="font-mincho text-[15px] leading-snug line-clamp-2 group-hover:text-aoyagi transition">
                  {b.title}
                </div>
                <div className="text-xs text-muted mt-1 line-clamp-1">
                  {b.authors}
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      b.status === "available" ? "bg-aoyagi" : "bg-yamabuki"
                    }`}
                  />
                  <span className="text-xs text-ink-soft">
                    {b.status === "available" ? "貸出可" : "貸出中"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted">
          条件に一致する書籍は見つかりませんでした
        </div>
      )}
    </AppShell>
  );
}