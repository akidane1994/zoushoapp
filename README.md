# 蔵書管理アプリ (Library Management App)

Googleスプレッドシートをデータベースとして利用する蔵書管理Webアプリケーションです。
スマホのカメラでISBNバーコードを読み取ることで、書籍の登録・貸出・返却をスムーズに行うことができます。

## 📌 主な機能

### 1. ユーザー機能 (User)
* **貸出・返却:** スマホカメラでバーコードをスキャンして、本の貸出・返却処理を行います。
* **在庫確認:** スキャンした本が蔵書リストにあるか自動で照合します。
* **自動計算:** 貸出時に「2週間後」の返却予定日を自動計算して記録します。

### 2. 管理者機能 (Admin)
* **蔵書登録:** ISBNをスキャンすると、Google Books API / OpenBD から書誌情報を自動取得し、スプレッドシートに登録します。
* **重複チェック:** 既に登録済みの本かどうかをチェックします。

### 3. 認証・セキュリティ
* **Googleログイン:** Googleアカウントを使用したSSO（シングルサインオン）。
* **アクセス制御:** 管理者ページには、指定されたメールアドレスを持つユーザーのみアクセス可能です。

---

## 🛠 技術スタック

* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Database:** Google Spreadsheets (via `google-spreadsheet`)
* **Authentication:** NextAuth.js (Google Provider)
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