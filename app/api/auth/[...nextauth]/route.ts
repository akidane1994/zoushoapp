import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// 認証の設定オプション
export const authOptions: NextAuthOptions = {
  // 認証プロバイダーの設定
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  // セッションの設定 (JWTを使用)
  session: {
    strategy: "jwt",
  },
  // ログインページのカスタマイズ（後で自作ページに差し替えますが、一旦デフォルトで動作確認）
  // pages: {
  //   signIn: '/login',
  // },
  callbacks: {
    // セッションに情報を含める処理
    async session({ session, token }) {
      return session;
    },
    // ログイン時の制御（ここでAdmin判定も可能ですが、今回はMiddlewareで行います）
    async signIn({ user, account, profile }) {
      return true; // 誰でもログインOK（アクセス制御は別で行う）
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };