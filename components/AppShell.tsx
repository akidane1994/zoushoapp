"use clinet";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
    LayoutGrid,
    BookOpen,
    Search,
    Bookmark,
    Repeat,
    PlusSquare,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType; admin?: boolean };

const NAV: NavItem[] = [
    { href: "/dashboard", label: "ホーム", icon: LayoutGrid },
    { href: "/books", label: "蔵書一覧", icon: BookOpen },
    { href: "/search", label: "検索・絞り込み", icon: Search },
    { href: "/borrowed", label: "借りているもの", icon: Bookmark },
    { href: "/user", label: "貸出・返却", icon: Repeat },
    { href: "/admin", label: "蔵書登録", icon: PlusSquare, admin: true },
  ];
  
  export default function AppShell({
    title,
    action,
    children,
  }: {
    title: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
  }) {
    const pathname = usePathname() ?? "";
    const { data: session } = useSession();
    const isActive = (href: string) =>
      pathname === href || pathname.startsWith(href + "/");
  
    return (
      <div className="flex min-h-screen">
        {/* ── サイドバー（md以上で表示） ───────────────────────── */}
        <aside className="hidden md:flex w-60 shrink-0 bg-ink text-paper flex-col py-7">
          <div className="px-7 pb-6 flex items-center gap-3 border-b border-white/10">
            <span className="w-8 h-8 rounded-lg bg-aoyagi grid place-items-center font-mincho text-white">
              青
            </span>
            <span className="font-mincho text-lg tracking-wide">青柳文庫</span>
          </div>
  
          <nav className="px-4 py-5 flex flex-col gap-1 text-sm">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[10px] transition ${
                    active
                      ? "bg-white/10 text-white font-bold border-l-[3px] border-leaf"
                      : "text-paper/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {label}
                </Link>
              );
            })}
          </nav>
  
          <div className="mt-auto px-6 pt-5 flex items-center gap-3 border-t border-white/10">
            <span className="w-9 h-9 rounded-full bg-aoyagi grid place-items-center text-white text-sm">
              {session?.user?.name?.[0] ?? "U"}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] truncate">{session?.user?.name ?? "ゲスト"}</div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-[11px] text-muted hover:text-white transition"
              >
                ログアウト
              </button>
            </div>
          </div>
        </aside>
  
        {/* ── メイン ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-[74px] shrink-0 border-b border-line bg-surface flex items-center justify-between px-5 md:px-10">
            <div className="font-mincho text-lg md:text-[22px] truncate">{title}</div>
            {action}
          </header>
          <main className="flex-1 p-5 md:p-8 lg:p-10 pb-24 md:pb-10">{children}</main>
        </div>
  
        {/* ── モバイル用ボトムナビ（md未満） ───────────────────── */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-ink text-paper flex justify-around py-2 border-t border-white/10 z-50">
          {NAV.filter((n) => !n.admin).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-1 text-[10px] ${
                isActive(href) ? "text-white" : "text-paper/55"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    );
  }