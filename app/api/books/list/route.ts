import { NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// キャッシュ無効化 (常に最新のステータスを返すため)
export const dynamic = 'force-dynamic';

// --- 環境設定 ---
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

export async function GET() {
  try {
    // 1. セッションチェック (ログインしていない人は見れないようにする)
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 2. スプレッドシート接続
    const serviceAccountAuth = new JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    // 3. データ取得 (並列実行で高速化)
    const inventorySheet = doc.sheetsByIndex[0]; // 蔵書リスト (Sheet1)
    const transactionSheet = doc.sheetsByTitle['transactions']; // 貸出履歴

    // 両方のシートを同時に読み込む
    const [inventoryRows, transactionRows] = await Promise.all([
      inventorySheet.getRows(),
      transactionSheet.getRows(),
    ]);

    // 4. 「現在貸出中」のマップを作成 (ISBN -> 返却予定日)
    // returnedAt が空の行 = 貸出中
    const lendingMap = new Map<string, { dueAt: string; borrowerName: string }>();
    
    transactionRows.forEach((row) => {
      const isbn = row.get('isbn');
      const returnedAt = row.get('returnedAt');
      
      // まだ返却されていない場合
      if (isbn && !returnedAt) {
        lendingMap.set(isbn, {
          dueAt: row.get('dueAt'),
          borrowerName: row.get('borrowerName'),
        });
      }
    });

    // 5. 蔵書リストにステータスを結合して整形
    const books = inventoryRows.map((row) => {
      const isbn = row.get('isbn');
      const lendingInfo = lendingMap.get(isbn);

      return {
        isbn: isbn,
        title: row.get('title'),
        authors: row.get('authors'), // カンマ区切り文字列のまま返すか、配列にするかはフロントで調整可
        thumbnailUrl: row.get('image'),
        // ステータス判定
        status: lendingInfo ? 'lent' : 'available', 
        // 貸出中なら詳細情報を付与
        lendingDetail: lendingInfo || null,
      };
    });

    // 最新順（登録順の逆）などにしたい場合はここで .reverse() 等
    return NextResponse.json(books.reverse());

  } catch (error) {
    console.error('Book List API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch book list' }, { status: 500 });
  }
}