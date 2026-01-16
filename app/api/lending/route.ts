import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';

// --- 環境設定 ---
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// --- ヘルパー関数: 日本時間のYYYY-MM-DDを取得 ---
const getJstDateString = (date: Date = new Date()): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date).replace(/\//g, '-'); // 2024/01/01 -> 2024-01-01
};

// --- ヘルパー関数: スプレッドシート接続 ---
async function getSheet() {
  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    throw new Error('環境変数が設定されていません');
  }

  const serviceAccountAuth = new JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  
  // 'transactions' という名前のシートを取得
  const sheet = doc.sheetsByTitle['transactions'];
  if (!sheet) {
    throw new Error('transactions シートが見つかりません');
  }
  return sheet;
}

/**
 * 貸出処理 (POST)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { isbn, title, borrowerName, borrowerGroup } = body;

    // バリデーション
    if (!isbn || !borrowerName || !borrowerGroup) {
      return NextResponse.json({ error: '必須項目(ISBN, 氏名, グループ)が不足しています' }, { status: 400 });
    }

    const sheet = await getSheet();

    // 日付計算 (JST)
    const today = new Date();
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(today.getDate() + 14);

    // 新しい行を追加
    const newRow = {
      id: uuidv4(),
      isbn: isbn,
      title: title || 'タイトル不明', // タイトルは任意（なくてもエラーにしない）
      borrowedAt: getJstDateString(today),
      dueAt: getJstDateString(twoWeeksLater),
      borrowerName: borrowerName,
      borrowerGroup: borrowerGroup,
      returnedAt: '', // 貸出時は空欄
    };

    await sheet.addRow(newRow);

    return NextResponse.json({ message: '貸出処理が完了しました', data: newRow });

  } catch (error) {
    console.error('Lending Error:', error);
    return NextResponse.json({ error: '貸出処理に失敗しました' }, { status: 500 });
  }
}

/**
 * 返却処理 (PUT)
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { isbn } = body;

    if (!isbn) {
      return NextResponse.json({ error: 'ISBNが必要です' }, { status: 400 });
    }

    const sheet = await getSheet();
    const rows = await sheet.getRows();

    // 「該当するISBN」かつ「まだ返却されていない(returnedAtが空)」行を探す
    // ※複数ある場合は、リストの最後（最新）のものを対象とする運用とします
    const targetRow = rows.reverse().find((row) => {
        return row.get('isbn') === isbn && !row.get('returnedAt');
    });

    if (!targetRow) {
      return NextResponse.json({ error: 'この本は現在貸し出されていません' }, { status: 404 });
    }

    // 返却日を書き込む
    const today = new Date();
    targetRow.assign({ returnedAt: getJstDateString(today) });
    await targetRow.save();

    return NextResponse.json({ 
        message: '返却処理が完了しました', 
        data: {
            title: targetRow.get('title'),
            borrower: targetRow.get('borrowerName')
        }
    });

  } catch (error) {
    console.error('Returning Error:', error);
    return NextResponse.json({ error: '返却処理に失敗しました' }, { status: 500 });
  }
}