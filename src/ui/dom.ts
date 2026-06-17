/** 小さな DOM 構築ヘルパ群。 */

type Attrs = Record<string, string | number | boolean | undefined>;
type Child = Node | string | null | undefined | Child[];

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) {
      continue;
    }
    if (k === "class") {
      node.className = String(v);
    } else if (k === "dataset") {
      // handled separately if needed
    } else if (k.startsWith("on") && typeof v === "string") {
      // ignore string handlers
    } else {
      node.setAttribute(k, String(v));
    }
  }
  appendChildren(node, children);
  return node;
}

function appendChildren(node: HTMLElement, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined) {
      continue;
    }
    if (Array.isArray(c)) {
      appendChildren(node, c);
    } else if (typeof c === "string") {
      node.appendChild(document.createTextNode(c));
    } else {
      node.appendChild(c);
    }
  }
}

export function button(
  label: string,
  onClick: () => void,
  opts: { class?: string; title?: string } = {}
): HTMLButtonElement {
  const b = el("button", { class: opts.class ?? "", title: opts.title ?? "" }, label);
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

export function select<T extends string>(
  options: { value: T; label: string }[],
  value: T,
  onChange: (v: T) => void,
  opts: { class?: string; title?: string } = {}
): HTMLSelectElement {
  const s = el("select", { class: opts.class ?? "", title: opts.title ?? "" });
  for (const o of options) {
    const opt = el("option", { value: o.value }, o.label);
    if (o.value === value) {
      opt.setAttribute("selected", "selected");
    }
    s.appendChild(opt);
  }
  s.value = value;
  s.addEventListener("change", () => onChange(s.value as T));
  return s;
}

export function textInput(
  value: string,
  onCommit: (v: string) => void,
  opts: { class?: string; placeholder?: string } = {}
): HTMLInputElement {
  const i = el("input", {
    class: opts.class ?? "",
    type: "text",
    value,
    placeholder: opts.placeholder ?? "",
  });
  i.value = value;
  const commit = () => onCommit(i.value);
  i.addEventListener("change", commit);
  i.addEventListener("blur", commit);
  return i;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}
