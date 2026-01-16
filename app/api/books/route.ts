import { NextRequest, NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from 'google-auth-library';

const API_KEY = process.env.GOOGLE_BOOKSAPI_KEY;

// ---型定義---
type BookData = {
    isbn: string;
    title: string;
    authors: string[];
    publishedDate: string;
    thumbnailUrl: string;
    source: 'GoogleBooks' | 'OpenBD' | 'Inventory';
};

// ---設定値---
const TIMEOUT_MS = 3000; //3秒でタイムアウト
const MAX_RETRIES = 1; //初回＋1回リトライ

// ---スプレッドシート接続設定---
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// 蔵書検索用関数
async function fetchFromInventory(isbn: string): Promise<BookData | null> {
  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    console.error('Environment variables missing');
    return null;
  }

  try {
    const serviceAccountAuth = new JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    // 蔵書リストは1枚目のシートにある前提
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    // ISBNで検索 (ハイフン有無を考慮して正規化した値同士で比較するのが理想だが、今回は完全一致または簡易比較)
    // 登録データ側も正規化されている前提とします
    const targetRow = rows.find(row => row.get('isbn') === isbn);

    if (!targetRow) return null;

    return {
      isbn: targetRow.get('isbn'),
      title: targetRow.get('title'),
      authors: targetRow.get('authors') ? targetRow.get('authors').split(',') : [],
      publishedDate: targetRow.get('publishedDate'),
      thumbnailUrl: targetRow.get('image'),
      source: 'Inventory',
    };
  } catch (error) {
    console.error('Inventory Search Error:', error);
    return null;
  }
}

/**
 * 指定時間でタイムアウトするFetchラッパー
 */

async function fetchWithTimeout(url: string, options: RequestInit = {}) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(id);
        return response;
        } catch(error) {
            clearTimeout(id);
            throw error;
    }
}

/**
 * リトライ機能付きFetch
 */
async function fetchWithRetry(url: string): Promise<Response> {
    let lastError;
    for (let i = 0; i <= MAX_RETRIES; i++) {
        try {
            return await fetchWithTimeout(url);
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed for ${url}:`, error);
            lastError = error;
        }
    }
    throw lastError;
}

// ---Google　Books API処理---
async function fetchFromGoogleBooks(isbn: string): Promise<BookData | null> {
    try {
        const res = await fetchWithRetry(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${API_KEY}`);
        if (!res.ok) return null;

        const data = await res.json();
        if(!data.items || data.items.length === 0) return null;

        const volumeInfo = data.items[0].volumeInfo;

        //データ整形
        return {
            isbn: isbn,
            title: volumeInfo.title || 'タイトル不明',
            authors: volumeInfo.authors || ['著者不明'],
            publishedDate: volumeInfo.publishedDate || '',
            thumbnailUrl: volumeInfo.imageLinks?.thumbnail || '',
            source: 'GoogleBooks',
        };
    } catch (error) {
        console.error('Google Books API Error:', error);
        return null;
    }
}

// --- OpenBD API 処理 ---
async function fetchFromOpenBD(isbn: string): Promise<BookData | null> {
    try {
      const res = await fetchWithRetry(`https://api.openbd.jp/v1/get?isbn=${isbn}`);
      if (!res.ok) return null;
  
      const json = await res.json();
      // OpenBDは該当なしの場合 [null] を返す
      if (!json || json.length === 0 || json[0] === null) return null;
  
      const data = json[0];
      const summary = data.summary;
  
      // データ整形
      return {
        isbn: isbn,
        title: summary.title || 'タイトル不明',
        authors: summary.author ? summary.author.split(' ') : ['著者不明'], // OpenBDはスペース区切りの文字列で来ることが多い
        publishedDate: summary.pubdate || '',
        thumbnailUrl: summary.cover || '',
        source: 'OpenBD',
      };
    } catch (error) {
      console.error('OpenBD API Error:', error);
      return null;
    }
  }
  
  // --- メインハンドラ ---
  export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const rawIsbn = searchParams.get('isbn');
    const type = searchParams.get('type'); //検索モード ('inventory' | undefined)
  
    if (!rawIsbn) {
      return NextResponse.json({ error: 'ISBN is required' }, { status: 400 });
    }
  
    // ISBN正規化（ハイフン除去・数値のみ抽出）
    const isbn = rawIsbn.replace(/[^0-9X]/g, '');

    // 蔵書確認モードの場合の処理
    if (type === 'inventory') {
      const inventoryData = await fetchFromInventory(isbn);
      if (inventoryData) {
          return NextResponse.json(inventoryData);
      } else {
          // 蔵書にない場合は404エラー
          return NextResponse.json({ error: 'この本は蔵書登録されていません' }, { status: 404 });
      }
    }
  
    // 1. Google Books API を試行
    let bookData = await fetchFromGoogleBooks(isbn);
  
    // 2. 失敗したら OpenBD を試行 (フォールバック)
    if (!bookData) {
      console.log(`Google Books failed for ${isbn}, trying OpenBD...`);
      bookData = await fetchFromOpenBD(isbn);
    }
  
    // 3. 両方ダメだった場合
    if (!bookData) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }
  
    // 4. 成功レスポンス
    return NextResponse.json(bookData);
  }