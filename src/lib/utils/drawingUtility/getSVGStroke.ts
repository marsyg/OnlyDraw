export function getSvgPathFromStroke(stroke:number[][]): string {
  if (!stroke.length) return "";

  const d = stroke.reduce<string[]>(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0.toString(), y0.toString(), ((x0 + x1) / 2).toString(), ((y0 + y1) / 2).toString());
      return acc;
    },
    ["M", ...stroke[0].map(n => n.toString()), "Q"]
  );

  d.push("Z");
  return d.join(" ");
}