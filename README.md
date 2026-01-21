# 蔵書管理アプリ (Library Management App)

Googleスプレッドシートをデータベースとして利用する蔵書管理Webアプリケーションです。
スマホのカメラでISBNバーコードを読み取ることで、書籍の登録・貸出・返却をスムーズに行うことができます。

## 📌 主な機能

### 1. ユーザー機能 (User)
* **貸出・返却:** スマホカメラでバーコードをスキャンして、本の貸出・返却処理を行います。
* **蔵書検索・一覧:** タイトルや著者名で蔵書を検索できます。
* **状況確認:** 各書籍が「貸出可」か「貸出中」かを確認でき、貸出中の場合は「誰が・いつまで」借りているかが分かります。
* **自動計算:** 貸出時に「2週間後」の返却予定日を自動計算して記録します。

### 2. 通知・自動化 (Automation)
* **Slack通知:** 本が貸し出されると、管理用Slackチャンネルに即座に通知が飛びます。
* **返却リマインド:** 毎日朝9時に自動チェックを行い、返却期限が「2日後」に迫っている未返却ユーザーへメールで通知します。

### 3. 管理者機能 (Admin)
* **蔵書登録:** ISBNをスキャンすると、Google Books API / OpenBD から書誌情報を自動取得し、スプレッドシートに登録します。
* **重複チェック:** 既に登録済みの本かどうかをチェックします。

### 4. 認証・セキュリティ
* **Googleログイン:** Googleアカウントを使用したSSO。名前やメールアドレスを自動取得して記録します。
* **アクセス制御:** 管理者ページには、許可されたメールアドレスを持つユーザーのみアクセス可能です。

---

## 🛠 技術スタック

**Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Database:** Google Spreadsheets (via `google-spreadsheet`)
* **Authentication:** NextAuth.js (Google Provider)
* **Notification:** Slack Incoming Webhook / Nodemailer (Gmail SMTP)
* **Cron Job:** Vercel Cron (for automated reminders)
* **Barcode Scanner:** `html5-qrcode`
* **Styling:** Tailwind CSS
* **Icons:** Lucide React

---

## 🚀 セットアップ手順

### 1. リポジトリのクローンとインストール
```bash
git clone <repository-url>
cd <project-folder>
npm install

### 2. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の内容を記述してください。

```env
# --- Google Sheets 設定 ---
# スプレッドシートのURL ( [https://docs.google.com/spreadsheets/d/](https://docs.google.com/spreadsheets/d/)[ここがID]/edit )
GOOGLE_SHEET_ID=your_sheet_id_here

# Service AccountのJSONキーの中身
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
# 改行コード(\n)を含むため、全体をダブルクォートで囲んでください
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# --- Google OAuth (NextAuth) 設定 ---
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret

# --- NextAuth 設定 ---
# ランダムな文字列 (生成例: openssl rand -base64 32)
NEXTAUTH_SECRET=your_random_secret_string
# ローカル開発時は http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

# --- アプリ設定 (アクセス制御) ---
# Adminページへのアクセスを許可するメールアドレス（カンマ区切り）
ADMIN_EMAILS=admin1@example.com,admin2@example.com

# --- 通知機能設定 (追加) ---
# Slack Incoming Webhook URL
SLACK_WEBHOOK_URL=[https://hooks.slack.com/services/T000](https://hooks.slack.com/services/T000)...

# Gmail 送信設定 (リマインドメール用)
# アプリパスワードはGoogleアカウント設定 > セキュリティ > 2段階認証 > アプリパスワード から発行
GMAIL_USER=your_gmail@example.com
GMAIL_APP_PASSWORD=abcdefghijklmnop

# Cronジョブ認証 (Vercel環境では自動設定されるため、ローカルテスト時のみ任意で設定)
# CRON_SECRET=