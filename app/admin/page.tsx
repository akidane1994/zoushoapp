'use client';

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import AppShell from "@/components/AppShell";
import BookCover from "@/components/BookCover";

const BarcodeScanner = dynamic(
  () => import("../../components/BarcodeScanner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[236px] rounded-2xl bg-ink/90 grid place-items-center text-paper/70">
        カメラ準備中...
      </div>
    ),
  }
);

type BookData = {
  isbn: string;
  title: string;
  authors: string[];
  publishedDate: string;
  publisher?: string;
  thumbnailUrl: string;
  source: "GoogleBooks" | "OpenBD";
  duplicate?: boolean; // ← /api/books が重複判定を返す場合に表示
};

const GENRES = ["技術", "ビジネス", "教養", "デザイン", "自己啓発", "その他"];

export default function AdminPage() {
  const [isbn, setIsbn] = useState("");
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scan, setScan] = useState(false);
  const [genre, setGenre] = useState("技術");
  const [tags, setTags] = useState<string[]>([]);

  const fetchBook = useCallback(async (code: string) => {
    if (!code) return;
    setLoading(true);
    setError("");
    setBook(null);
    try {
      const res = await fetch(`/api/books?isbn=${code}`);
      if (!res.ok) throw new Error("書籍が見つかりませんでした");
      setBook(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "予期せぬエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  const register = async () => {
    if (!book) return;
    if (!confirm(`「${book.title}」を登録しますか？`)) return;
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...book, genre, tags }), // ← genre / tags を追加送信
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "登録に失敗しました");
      }
      alert("登録しました");
      setBook(null);
      setIsbn("");
      setTags([]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "エラー");
    }
  };

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const el = e.target as HTMLInputElement;
    const v = el.value.trim();
    if (v && !tags.includes(v)) setTags((t) => [...t, v]);
    el.value = "";
  };

  return (
    <AppShell title="蔵書登録">
      <div className="flex flex-col lg:flex-row gap-9 max-w-5xl">
        {/* 左：スキャン／ISBN入力 */}
        <div className="w-full lg:w-[360px] shrink-0 space-y-4">
          {scan ? (
            <BarcodeScanner
              onDetected={(c: string) => {
                setScan(false);
                setIsbn(c);
                fetchBook(c);
              }}
              onCancel={() => setScan(false)}
            />
          ) : (
            <button
              onClick={() => setScan(true)}
              className="w-full h-[236px] rounded-2xl bg-ink text-paper/80 flex flex-col items-center justify-center gap-3 hover:text-paper transition"
            >
              <span className="w-[140px] h-[90px] border-2 border-white/35 rounded-lg" />
              <span className="text-sm">ISBNバーコードをスキャン</span>
            </button>
          )}

          <div className="bg-surface border border-line rounded-2xl p-5">
            <div className="text-sm text-muted mb-2.5">
              または手動でISBNを入力
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchBook(isbn);
              }}
              className="flex gap-2.5"
            >
              <input
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="9784..."
                className="flex-1 bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm font-mono outline-none focus:border-aoyagi transition"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-aoyagi text-white rounded-lg px-5 text-sm font-bold disabled:opacity-50"
              >
                検索
              </button>
            </form>
          </div>
        </div>

        {/* 右：取得結果＋登録フォーム */}
        <div className="flex-1 min-w-0 bg-surface border border-line rounded-2xl p-6 md:p-8">
          {loading && <div className="text-muted animate-pulse">処理中...</div>}
          {error && <div className="text-yamabuki text-sm">{error}</div>}
          {!loading && !book && !error && (
            <div className="text-muted text-sm py-8">
              バーコードをスキャンするか、ISBNを入力してください。
            </div>
          )}

          {book && (
            <>
              <div className="flex items-center gap-2.5 mb-5">
                <span className="bg-leaf-soft text-aoyagi rounded-md px-3 py-1 text-xs font-bold">
                  自動取得 ✓
                </span>
                <span className="text-sm text-muted">
                  {book.source} から書誌情報を取得しました
                </span>
              </div>

              <div className="flex gap-5 pb-6 mb-6 border-b border-line">
                <BookCover
                  title={book.title}
                  src={book.thumbnailUrl}
                  className="w-[84px] h-[118px] rounded-md shadow-sm shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-mincho text-xl leading-snug">
                    {book.title}
                  </div>
                  <div className="text-sm text-ink-soft mt-1.5">
                    {book.authors?.join("、")}
                  </div>
                  <div className="text-xs text-muted mt-1.5 font-mono">
                    ISBN {book.isbn}
                    {book.publisher ? ` ・ ${book.publisher}` : ""}
                  </div>
                  {book.duplicate && (
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-yamabuki-soft text-[#8A5A22] rounded-md px-3 py-1.5 text-xs">
                      ⚠ 同じ本が既に登録されています
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-5 mb-6">
                <div className="max-w-[300px]">
                  <div className="text-xs font-bold mb-2">ジャンル</div>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-white border border-line rounded-lg px-3.5 py-2.5 text-sm"
                  >
                    {GENRES.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs font-bold mb-2">
                    タグ <span className="text-muted font-normal">（任意）</span>
                  </div>
                  <input
                    onKeyDown={addTag}
                    placeholder="入力して Enter"
                    className="bg-white border border-line rounded-lg px-3.5 py-2.5 text-sm w-full max-w-sm outline-none focus:border-aoyagi transition"
                  />
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {tags.map((t, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 bg-leaf-soft text-aoyagi rounded-md px-3 py-1.5 text-xs"
                      >
                        {t}
                        <button
                          onClick={() =>
                            setTags((arr) => arr.filter((_, j) => j !== i))
                          }
                          className="text-aoyagi/60 hover:text-aoyagi"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3.5 justify-end border-t border-line pt-5">
                <button
                  onClick={() => setBook(null)}
                  className="bg-white border border-line text-ink-soft rounded-[10px] px-7 py-3 text-sm font-bold"
                >
                  キャンセル
                </button>
                <button
                  onClick={register}
                  className="bg-aoyagi text-white rounded-[10px] px-9 py-3 text-sm font-bold hover:bg-aoyagi-dark transition"
                >
                  登録する
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
