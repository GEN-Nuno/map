import "./styles.css";
import { Store } from "./model/store";
import { sampleShelf } from "./model/sample";
import { Toolbar } from "./ui/toolbar";
import { ShelfPanel } from "./ui/shelfPanel";
import { EditorPanel } from "./ui/editorPanel";
import { PreviewPanel } from "./ui/previewPanel";
import { el } from "./ui/dom";

// 初回起動でデータが無ければサンプルを投入
let store = new Store();
if (store.shelf.diagrams.length === 0) {
  store.replaceShelf(sampleShelf());
}

const toolbar = new Toolbar(store);
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
app.replaceChildren(toolbar.root, body);
