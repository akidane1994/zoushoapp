import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

// セッション情報の拡張
declare module "next-auth" {
  interface Session {
    user: {
      // idなどの追加プロパティがあればここに定義
      id?: string;
    } & DefaultSession["user"];
  }
}

// JWTトークンの拡張
declare module "next-auth/jwt" {
  interface JWT {
    // ここにJWTに保存したいプロパティを追加
    id?: string;
    email?: string;
    name?: string;
  }
}