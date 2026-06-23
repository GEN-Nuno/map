# SeqShelf — 4階層シーケンス図の「本棚」(Web アプリ)

Mermaid のシーケンス図を **L1 運用フロー / L2 システム構成 / L3 クラス間 / L4 関数内部**
の 4 階層に束ね、本棚から本を取り出して読むように見たい図を辿り、**GUI でそのまま編集**できる
ブラウザアプリです。バックエンド不要・ブラウザだけで完結します。

> **本＝運用フロー**、**目次＝関数レベル**。横線（メッセージ）の詳細はリンクで下階層の図へ降りていける。
> タイムアウトやエラーの分岐は alt / opt / par / break / critical で表現。

## 起動

### 一番かんたん（推奨）

エクスプローラで **`start.cmd` をダブルクリック**してください。
同梱のポータブル Node.js を使って依存インストール〜開発サーバ起動まで自動で行い、
ブラウザで `http://localhost:5173/` が開きます。

PowerShell から起動する場合:

```powershell
./start.ps1
```

### Node.js を自分で用意している場合

システムに Node.js がインストール済みなら、通常どおり:

```powershell
npm install
npm run dev      # 開発サーバ (http://localhost:5173)
npm run build    # 本番ビルド (dist/ に出力)
npm run preview  # ビルド結果をプレビュー
```

> **`npm` が「実行できません」と出る場合**
> このリポジトリにはポータブル Node.js (`.node/`) を同梱しています。PowerShell の
> 実行ポリシーで `npm.ps1` がブロックされることがあるため、上の `start.cmd` /
> `start.ps1` を使うのが確実です。手動で行う場合は次のように `node` を直接呼びます:
>
> ```powershell
> $env:Path = "$PWD\.node\node-v22.14.0-win-x64;" + $env:Path
> node node_modules\vite\bin\vite.js          # dev サーバ
> ```


## 画面構成

```
┌──────────────────────────────────────────────────────────┐
│ ツールバー  📚SeqShelf / サンプル / 空に / JSON / Mermaid / SVG │
├────────────┬───────────────────────┬───────────────────────┤
│ 本棚        │ GUI エディタ           │ プレビュー             │
│ (L1〜L4)    │ ・縦線(参加者)         │ ・Mermaid 描画         │
│  本を選ぶ    │ ・横線(メッセージ)     │ ・▲親へ / ▼子へ        │
│            │ ・条件(alt/opt/...)    │ ・図ジャンプ / ズーム  │
│            │  追加・挟み込み        │ ・リンク🔗で下階層へ    │
└────────────┴───────────────────────┴───────────────────────┘
```

## できること

- **本棚**: 図を L1→L4 で一覧。クリックで選択。`＋新規L1` / `＋同層` / `＋子図` と各層ヘッダの `＋` で追加、`＋子` で個別に子図追加、🗑で削除。
- **GUI 編集（ボタンだけで作れる）**:
  - **親図の整合性ガード** … 親図は 1 つ上の層のみ選択可能（循環参照を防止）
  - **＋縦線** … アクター / 外部システム / プロセス / DB / キュー / クラス / 関数 を追加、↑↓で並べ替え
  - **＋横線** … from→to・矢印種別（同期/戻り/非同期/消失）・本文を選ぶだけ。**＋下**で任意位置に挟み込み
  - **＋条件** … alt / opt / par / break / critical を挿入。分岐(else/and/option)の追加、ネストも可
  - **リンク** … 各横線に「→ 下階層の図」を割り当て（その横線の詳細を別図に）
- **プレビュー**: Mermaid をその場で描画。**▲親へ / ▼子へ**、全図ドロップダウン、ズーム、
  図中の🔗付きメッセージをクリックで下階層へジャンプ。パンくずで上下移動。
- **保存・入出力**:
  - 変更は **localStorage に自動保存**（次回もそのまま）
  - **本棚保存/読込** で、名前付きの本棚スナップショットを複数保存して好きなタイミングで復元
  - **JSON** で本棚を書き出し / 読み込み（バックアップ・共有）
  - **Mermaid** / **SVG** で表示中の図を書き出し（他ツール貼付・画像化）
- **サンプル本棚**: 受注フロー（顧客→EC→倉庫 / WebApp→API→DB / Controller→Validator→Repo /
  validateOrder 正常系・タイムアウト系）を内蔵。初回は自動表示。

## データモデル

図は「参加者(縦線)」と「項目の順序付きツリー(items)」で構成されます。
items はメッセージ(横線)と制御ブロック(alt/opt/...)の入れ子で、
これにより縦線・横線・条件の追加と任意位置への挟み込みが自然に表現できます。
詳細は [src/model/types.ts](src/model/types.ts) を参照。

## 構成

```
index.html
src/
  main.ts              起動・パネル結線
  styles.css           スタイル
  model/
    types.ts           データモデル (Shelf/Diagram/Participant/Message/Block)
    store.ts           状態 + localStorage + 購読
    operations.ts      縦線/横線/条件の追加・挿入・移動・削除
    sample.ts          受注フローのサンプル本棚
    id.ts              id 生成
  mermaid/
    generate.ts        モデル → Mermaid sequenceDiagram テキスト
  ui/
    toolbar.ts         上部ツールバー (サンプル/入出力)
    shelfPanel.ts      左: 本棚一覧
    editorPanel.ts     中央: GUI エディタ
    previewPanel.ts    右: Mermaid 描画 + リンク辿り
    dom.ts             DOM ヘルパ
  io/
    exporters.ts       JSON/Mermaid/SVG 入出力
test/
  webapp.test.ts       生成・ツリー操作のユニットテスト
```

## 開発コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバ |
| `npm run build` | 型チェック + 本番ビルド (`dist/`) |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run typecheck` | 型チェックのみ |
| `npm test` | ユニットテスト (node:test + tsx) |
