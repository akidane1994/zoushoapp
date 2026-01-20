import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions"; // ★ここが変更点: libから読み込む

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };