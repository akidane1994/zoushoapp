import { redirect } from 'next/navigation';

export default function Home() {
  // アクセス時、即座にログインページへ転送
  redirect('/login');
}