import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// --- 環境設定 ---
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// --- ヘルパー関数: JST日付 ---
const getJstDateString = (date: Date = new Date()): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date).replace(/\//g, '-');
};

// --- ヘルパー関数: シート取得 ---
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

  const sheet = doc.sheetsByTitle['transactions'];
  if (!sheet) throw new Error('transactions シートが見つかりません');
  return sheet;
}

// --- ★修正: Slack通知送信関数 (貸出・返却兼用) ---
type NotificationType = 'borrow' | 'return';

async function sendSlackNotification(
  type: NotificationType,
  params: {
    title: string;
    borrowerName: string;
    date: string;       // 貸出日 or 返却日
    dueAt?: string;     // 返却予定日 (貸出時のみ使用)
  }
) {
  if (!SLACK_WEBHOOK_URL) return;

  // タイプに応じて文言と色を切り替え
  const isBorrow = type === 'borrow';
  const headerText = isBorrow ? "📚 本の貸出がありました" : "↩️ 本が返却されました";
  const color = isBorrow ? "#36a64f" : "#2eb886"; // 緑系で少し色味を変える（任意）

  try {
    const fields = [
      {
        type: "mrkdwn",
        text: `*利用者:*\n${params.borrowerName}`
      },
      {
        type: "mrkdwn",
        text: `*書籍タイトル:*\n${params.title}`
      }
    ];

    // 日付フィールドの追加
    if (isBorrow) {
      fields.push(
        { type: "mrkdwn", text: `*貸出日:*\n${params.date}` },
        { type: "mrkdwn", text: `*返却予定日:*\n${params.dueAt}` }
      );
    } else {
      fields.push(
        { type: "mrkdwn", text: `*返却日:*\n${params.date}` }
      );
    }

    const payload = {
      text: headerText, // 通知のプレビューテキスト
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: headerText,
            emoji: true
          }
        },
        {
          type: "section",
          fields: fields
        },
        // 貸出時のみ注意書きを表示
        ...(isBorrow ? [{
          type: "context",
          elements: [{ type: "mrkdwn", text: "※返却期限を確認してください" }]
        }] : [])
      ]
    };

    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Slack Notification Error:', error);
  }
}

/**
 * 貸出処理 (POST)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    const userName = session?.user?.name;

    if (!userEmail) {
      return NextResponse.json({ error: '認証情報が取得できませんでした' }, { status: 401 });
    }

    const body = await req.json();
    const { isbn, title, borrowerGroup } = body;

    if (!isbn || !borrowerGroup) {
      return NextResponse.json({ error: '必須項目不足' }, { status: 400 });
    }

    const sheet = await getSheet();

    const today = new Date();
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(today.getDate() + 14);

    const borrowedAt = getJstDateString(today);
    const dueAt = getJstDateString(twoWeeksLater);

    const newRow = {
      id: uuidv4(),
      isbn: isbn,
      title: title || 'タイトル不明',
      borrowedAt: borrowedAt,
      dueAt: dueAt,
      borrowerName: userName || '氏名不明',
      borrowerEmail: userEmail,
      borrowerGroup: borrowerGroup,
      returnedAt: '',
    };

    await sheet.addRow(newRow);

    // ★修正: Slack通知 (引数変更に対応)
    await sendSlackNotification('borrow', {
      title: title || 'タイトル不明',
      borrowerName: userName || '氏名不明',
      date: borrowedAt,
      dueAt: dueAt
    });

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

    // 該当する貸出中の行を探す
    const targetRow = rows.reverse().find((row) => {
        return row.get('isbn') === isbn && !row.get('returnedAt');
    });

    if (!targetRow) {
      return NextResponse.json({ error: 'この本は現在貸し出されていません' }, { status: 404 });
    }

    const today = new Date();
    const returnedAt = getJstDateString(today);

    // 返却日を書き込む
    targetRow.assign({ returnedAt: returnedAt });
    await targetRow.save();

    // ★追加: 返却通知を送信
    // 行データからタイトルと借りた人の名前を取得
    const bookTitle = targetRow.get('title') || 'タイトル不明';
    const borrowerName = targetRow.get('borrowerName') || '氏名不明';

    await sendSlackNotification('return', {
      title: bookTitle,
      borrowerName: borrowerName,
      date: returnedAt
    });

    return NextResponse.json({ 
        message: '返却処理が完了しました', 
        data: {
            title: bookTitle,
            borrower: borrowerName
        }
    });

  } catch (error) {
    console.error('Returning Error:', error);
    return NextResponse.json({ error: '返却処理に失敗しました' }, { status: 500 });
  }
}