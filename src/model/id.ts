let counter = 0;

/** 短い一意 id を生成する (時刻 + カウンタ)。 */
export function uid(prefix = "x"): string {
  counter = (counter + 1) % 100000;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}

/** 表示名から kebab な id スラッグを作る。 */
export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9ぁ-んァ-ヶ一-龠]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "item"
  );
}
