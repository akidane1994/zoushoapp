import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import nodemailer from 'nodemailer';

// --- 環境設定 ---
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// --- ヘルパー: 日付文字列 (YYYY-MM-DD) ---
const getJstDateString = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date).replace(/\//g, '-');
};

export async function GET(req: NextRequest) {
  try {
    // Vercel Cron以外からのアクセスを拒否するセキュリティチェック
    // Vercel上では自動的に process.env.CRON_SECRET が注入される
    const authHeader = req.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader ! == `Bearer ${process.env.CRON_SECRET}`
    ) {
        // ローカル開発環境(CRON_SECRETがない場合)は通すようにして、本番だけ守る
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    // 1. スプレッドシート準備
    if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
        return NextResponse.json({ error: '環境変数が不足しています' }, { status: 500 });
    }

    const serviceAccountAuth = new JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['transactions'];
    const rows = await sheet.getRows();

    // 2. 「2日後」の日付を計算
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + 2); // 今日 + 2日
    const targetDateString = getJstDateString(targetDate);

    console.log(`Checking for due date: ${targetDateString}`);

    // 3. 送信対象を抽出
    // 条件: 未返却 (returnedAtが空) かつ 返却予定日 (dueAt) が 2日後
    const targets = rows.filter(row => {
      return !row.get('returnedAt') && row.get('dueAt') === targetDateString;
    });

    if (targets.length === 0) {
      return NextResponse.json({ message: '送信対象はいませんでした', date: targetDateString });
    }

    // 4. メーラー設定
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    // 5. メール送信ループ
    const results = [];
    for (const row of targets) {
      const email = row.get('borrowerEmail');
      const name = row.get('borrowerName');
      const title = row.get('title');
      const dueAt = row.get('dueAt');

      if (!email) continue; // メールアドレスがない場合はスキップ

      const mailOptions = {
        from: `"蔵書管理システム" <${GMAIL_USER}>`,
        to: email,
        subject: `【返却期限リマインド】返却日が近づいています: ${title}`,
        text: `${name} さん\n\nお疲れ様です。蔵書管理システムです。\n\n現在貸出中の以下の書籍の返却期限が近づいています（2日後）。\n\n■書籍名: ${title}\n■返却期限: ${dueAt}\n\n期限内の返却をお願いいたします。\nもし延長が必要な場合や返却できない場合は、管理者までご連絡ください。\n\nよろしくお願いいたします。`,
      };

      await transporter.sendMail(mailOptions);
      results.push({ email, title });
    }

    return NextResponse.json({ 
      message: `${results.length}件のリマインドメールを送信しました`, 
      targets: results 
    });

  } catch (error) {
    console.error('Reminder Error:', error);
    return NextResponse.json({ error: 'リマインド処理に失敗しました' }, { status: 500 });
  }
}