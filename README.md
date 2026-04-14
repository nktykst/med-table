# MedTable

医学部生向けのスマートフォン対応時間割管理 PWA。

**Live Demo**: https://med-table.vercel.app

---

## 概要

医学部の複雑な時間割（週ごとのパターン変更・振替・一括登録）を効率よく管理するための Web アプリ。インストール不要で、ホーム画面に追加してネイティブアプリのように使える。

## 主な機能

- **時間割グリッド** — 週/月の2ビュー切替。祝日の自動表示。編集モードで空コマへの登録が可能
- **一括登録** — 曜日・時限・繰り返し週数を指定してまとめて登録
- **スロットメモ** — 「今日は骨学実習」など1コマごとに自由テキストを記入・セルに即時反映
- **出席管理** — 出席 / 遅刻 / 欠席を1タップで記録
- **課題管理** — 科目ごとの締切管理・完了チェック・今週の課題バナー
- **時間割共有** — 任意の期間をスナップショット化してコード/URLで共有・インポート
- **PWA** — オフライン閲覧対応、ホーム画面追加でネイティブ風 UI
- **プッシュ通知** — 課題締切のリマインダー（Web Push）

## 技術スタック

| カテゴリ | 使用技術 |
|---|---|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS + shadcn/ui |
| 認証 | NextAuth.js v5 (Credentials / JWT) |
| DB | Neon (PostgreSQL) + Drizzle ORM |
| PWA | next-pwa |
| デプロイ | Vercel |

## アーキテクチャのポイント

### 仮想週生成
DB に週レコードが存在しなくてもカレンダーが表示できるよう、クライアント側で学年開始から約12年分の仮想週をメモリ上で生成する。DB レコードは最初のアクセス時に遅延作成（Lazy Insert）。これにより、ユーザーが週を手動で登録する手間を完全に排除した。

### スロット解決ロジック
同じコマに対して複数のデータが存在する場合、以下の優先順位で解決する：

```
slot_overrides（週単位の個別上書き）
    ↓ なければ
pattern_slots（週パターンのデフォルト設定）
    ↓ なければ
null（空コマ）
```

`isEmpty` フラグにより、パターンのスロットを特定の週だけ明示的に空にすることもできる。

### 時間割共有
週のスロットを JSON スナップショットとして DB に保存し、8文字のランダムコードを発行。インポート時は科目名でマッチングし、存在しない科目は自動作成する。期間指定・繰り返しインポートにも対応。

### Lazy DB Proxy
`DATABASE_URL` が未設定の状態（Vercel のビルド時など）でも Next.js のビルドが通るよう、Neon クライアントを Proxy オブジェクトでラップして初期化を遅延させている。

## ローカル開発

```bash
# 依存関係インストール
npm install

# 環境変数を設定
cp .env.local.example .env.local
# DATABASE_URL, AUTH_SECRET, AUTH_URL, VAPID キーを記入

# DB スキーマを適用
npx drizzle-kit push

# 開発サーバー起動
npm run dev
```

## DB スキーマ

```
users ──< subjects
      ──< week_patterns ──< pattern_slots
      ──< weeks ──< slot_overrides
               ──< attendances
      ──< assignments
      ──< push_subscriptions
      ──< shared_timetables
```

## ディレクトリ構成

```
app/
├── (auth)/          # ログイン・登録ページ
├── (app)/           # メインアプリ（認証必須）
│   ├── page.tsx     # 時間割グリッド
│   ├── assignments/ # 課題管理
│   ├── settings/    # 設定（科目・パターン・週）
│   └── import/      # 時間割インポート
└── api/             # API Routes
components/
├── timetable/       # 時間割関連コンポーネント
└── ui/              # shadcn/ui コンポーネント
lib/
├── db/              # Drizzle スキーマ・クライアント
├── auth.ts          # NextAuth 設定
├── slot-resolver.ts # スロット解決ロジック
└── holidays.ts      # 日本の祝日ユーティリティ
```

## 環境変数

```
DATABASE_URL=                    # Neon 接続文字列
AUTH_SECRET=                     # NextAuth シークレット（ランダム文字列）
AUTH_URL=                        # デプロイ URL（例: https://med-table.vercel.app）
NEXT_PUBLIC_VAPID_PUBLIC_KEY=    # Web Push 公開鍵
VAPID_PRIVATE_KEY=               # Web Push 秘密鍵
```
