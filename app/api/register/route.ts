import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';

// 環境変数の読み込みとチェック
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'); // 改行コードの正規化

if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
  throw new Error('環境変数が設定されていません');
}

// 認証設定
const serviceAccountAuth = new JWT({
  email: CLIENT_EMAIL,
  key: PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { isbn, title, authors, publishedDate, thumbnailUrl } = body;

    if (!isbn || !title) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    // 1. スプレッドシートを読み込む
    const doc = new GoogleSpreadsheet(SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0]; // 最初のシートを使用

    // 2. 重複チェック（ISBNが既に存在するか確認）
    // ※行数が多い場合はパフォーマンス注意ですが、今回はMVPなので全件取得で対応
    const rows = await sheet.getRows();
    const isDuplicate = rows.some((row) => row.get('isbn') === isbn);

    if (isDuplicate) {
      return NextResponse.json(
        { error: 'この書籍は既に登録されています' },
        { status: 409 } // Conflict
      );
    }

    // 3. 行を追加
    const newRow = {
      id: uuidv4(), // 一意な管理ID
      isbn: isbn,
      title: title,
      authors: Array.isArray(authors) ? authors.join(', ') : authors,
      publishedDate: publishedDate,
      image: thumbnailUrl,
      status: 'available', // 初期ステータスは「在庫あり」
      registeredAt: new Date().toISOString(),
    };

    await sheet.addRow(newRow);

    return NextResponse.json({ message: '登録しました', data: newRow });

  } catch (error) {
    console.error('Spreadsheet Error:', error);
    return NextResponse.json(
      { error: '登録処理に失敗しました' },
      { status: 500 }
    );
  }
}