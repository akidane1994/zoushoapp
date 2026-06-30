"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AppShell from "../../components/AppShell";
import BookCover from "../../components/BookCover";

type LendingDetail = { dueAt: string; borrowerName: string };

type Book = {
  isbn: string;
  title: string;
  authors: string;
  thumbnailUrl?: string;
  status: "available" | "lent";
  lendingDetail?: LendingDetail;
};

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number | string;
  unit?: string;
  accent?: string;
}) {
  return (
    <div className="bg-surface border border-line rounded-2xl px-6 py-5">
      <div className="text-[13px] text-muted">{label}</div>
      <div className={`text-4xl font-bold mt-1 ${accent ?? "text-ink"}`}>
        {value}
        {unit && (
          <span className="text-sm text-muted font-medium ml-1">{unit}</span>
        )}
      </div>
    </div>
  );
}

// "2026/07/03" 等の文字列から返却までの残り日数を算出（パースできなければ null）
function daysLeft(due?: string): number | null {
  if (!due) return null;
  const t = Date.parse(due.replace(/年|月/g, "/").replace(/日/g, ""));
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    fetch("/api/books/list")
      .then((r) => r.json())
      .then(setBooks)
      .catch(console.error);
  }, []);

  const { total, lent, mine, dueSoon } = useMemo(() => {
    const lentBooks = books.filter((b) => b.status === "lent");
    const mineBooks = lentBooks.filter(
      (b) =>
        b.lendingDetail?.borrowerName &&
        session?.user?.name &&
        b.lendingDetail.borrowerName === session.user.name
    );
    const dueSoonCount = mineBooks.filter((b) => {
      const d = daysLeft(b.lendingDetail?.dueAt);
      return d !== null && d <= 3;
    }).length;
    return {
      total: books.length,
      lent: lentBooks.length,
      mine: mineBooks,
      dueSoon: dueSoonCount,
    };
  }, [books, session]);

  const recent = books.slice(0, 5);
  const name = session?.user?.name?.split(" ")[0] ?? "ゲスト";

  return (
    <AppShell
      title={`こんにちは、${name}さん`}
      action={
        <div className="flex gap-3">
          <Link
            href="/user"
            className="bg-aoyagi text-white rounded-[10px] px-5 py-2.5 text-sm font-bold hover:bg-aoyagi-dark transition"
          >
            本を借りる
          </Link>
          <Link
            href="/user"
            className="bg-surface border border-line text-aoyagi rounded-[10px] px-5 py-2.5 text-sm font-bold"
          >
            本を返す
          </Link>
        </div>
      }
    >
      {/* 指標 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
        <Stat label="蔵書数" value={total.toLocaleString()} unit="冊" />
        <Stat label="貸出中" value={lent} unit="冊" />
        <Stat
          label="自分が借りている"
          value={mine.length}
          unit="冊"
          accent="text-aoyagi"
        />
        <Stat
          label="返却期限が近い"
          value={dueSoon}
          unit="冊"
          accent="text-yamabuki"
        />
      </div>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
        {/* 借りている本 */}
        <div className="bg-surface border border-line rounded-2xl p-7">
          <h2 className="font-mincho text-lg mb-3">借りている本</h2>
          {mine.length === 0 ? (
            <div className="text-sm text-muted py-6">
              現在借りている本はありません。
            </div>
          ) : (
            mine.map((b) => {
              const d = daysLeft(b.lendingDetail?.dueAt);
              return (
                <Link
                  key={b.isbn}
                  href={`/books/${b.isbn}`}
                  className="flex items-center gap-4 py-4 border-t border-line/70"
                >
                  <BookCover
                    title={b.title}
                    src={b.thumbnailUrl}
                    className="w-10 h-14 rounded shadow-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-mincho truncate">{b.title}</div>
                    <div className="text-xs text-muted mt-0.5 truncate">
                      {b.authors}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-ink-soft">
                      返却 {b.lendingDetail?.dueAt}
                    </div>
                    {d !== null && (
                      <div
                        className={`text-xs font-bold mt-0.5 ${
                          d <= 3 ? "text-yamabuki" : "text-ink-soft"
                        }`}
                      >
                        あと{d}日
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* 最近追加された蔵書 */}
        <div className="bg-surface border border-line rounded-2xl p-7">
          <h2 className="font-mincho text-lg mb-4">最近追加された蔵書</h2>
          <div className="flex gap-4">
            {recent.map((b) => (
              <Link
                key={b.isbn}
                href={`/books/${b.isbn}`}
                className="flex-1 min-w-0"
              >
                <BookCover
                  title={b.title}
                  src={b.thumbnailUrl}
                  className="aspect-[3/4] w-full rounded shadow-sm"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}