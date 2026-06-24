import "./styles.css";
import { Store } from "./model/store";
import { Toolbar } from "./ui/toolbar";
import { ShelfPanel } from "./ui/shelfPanel";
import { EditorPanel } from "./ui/editorPanel";
import { PreviewPanel } from "./ui/previewPanel";
import { StartupBanner } from "./ui/startupBanner";
import { el } from "./ui/dom";

// データはユーザーが明示的に投入する (バナーから選択)。
// これにより、アプリ更新後に localStorage が空のとき、
// バックアップから復元する機会を奪わずに済む。
const store = new Store();

const toolbar = new Toolbar(store);
const banner = new StartupBanner(store);
const shelf = new ShelfPanel(store);
const editor = new EditorPanel(store);
const preview = new PreviewPanel(store);

const body = el(
  "div",
  { class: "layout" },
  shelf.root,
  el("div", { class: "main" }, editor.root, preview.root)
);

const app = document.getElementById("app")!;
app.replaceChildren(toolbar.root, banner.root, body);
