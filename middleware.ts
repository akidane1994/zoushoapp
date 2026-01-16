import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// 許可された管理者のメールリストを取得
const adminEmails = (process.env.ADMIN_EMAILS || "").split(",");

export default withAuth(
  function middleware(req) {
    // 1. ユーザーがログインしていることは withAuth が保証してくれる
    // ここではさらに細かいチェックを行う

    const { pathname } = req.nextUrl;
    const userEmail = req.nextauth.token?.email;

    // 2. Adminページへのアクセス制御
    if (pathname.startsWith("/admin")) {
      // メールアドレスが存在しない、または許可リストに含まれていない場合
      if (!userEmail || !adminEmails.includes(userEmail)) {
        // Userページへ強制送還（または403エラー画面）
        return NextResponse.redirect(new URL("/user", req.url));
      }
    }

    // 問題なければそのまま通す
    return NextResponse.next();
  },
  {
    callbacks: {
      // そもそもログインしているかどうかのチェック
      // true を返すと上記 middleware 関数が実行される
      // false を返すとログイン画面 (/login) に飛ばされる
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login", // 未ログイン時のリダイレクト先
    },
  }
);

// 3. Middlewareを適用するパスの指定
export const config = {
  // api, _next/static, _next/image, favicon.ico, loginページ は除外
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};