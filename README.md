# MofuChat（Vercel版）

かわいいデザインの「24時間で消える」軽量SNS（Vercelデプロイ対応版）です。
Vercel Postgres を使って本番運用できる構成にしています。

## 特徴
- 24時間で自動消去されるチャット（TTL）
- ルーム作成・ルーム一覧・メッセージ送信
- Vercel Serverless Functions + Vercel Postgres
- ローカルでも Vercel CLI で動作確認可能

## 技術スタック
- Node.js
- Vercel Serverless Functions
- Vercel Postgres
- Vanilla HTML/CSS/JS

## 使い方（Vercel）
1. GitHub に push
2. Vercel でプロジェクトを作成
3. Vercel Postgres を追加
4. `POSTGRES_URL` を自動連携（Vercel側で設定）
5. デプロイ完了

## 使い方（ローカル）
1. 依存関係のインストール

```
npm install
```

2. Vercel にログイン

```
vercel login
```

3. 環境変数を取得

```
vercel env pull
```

4. ローカル起動

```
vercel dev
```

5. ブラウザで開く

```
http://localhost:3000
```

## 主要ファイル
- `api/_db.js` : DB初期化・クエリ処理
- `api/rooms/index.js` : ルーム一覧 / 作成 API
- `api/rooms/[id]/messages.js` : メッセージ一覧 / 送信 API
- `index.html` / `style.css` : フロントUI

## API（簡易）
- `GET /api/rooms` : ルーム一覧
- `POST /api/rooms` : ルーム作成（body: { name })
- `GET /api/rooms/:id/messages` : メッセージ一覧
- `POST /api/rooms/:id/messages` : メッセージ送信（body: { author, body })

## メモ
- 24時間経過したメッセージはリクエスト時に自動削除されます。
- ルーム名は最大40文字、メッセージ本文は最大280文字に制限しています。