export type MeasuredNode = {
  w: number;
  h: number;
  lines: string[];
  fontSize: number;
};

export function measureAndSizeNode(
  label: string,
  role: 'process' | 'decision' | 'terminal',
): MeasuredNode {
  const fontSize = 14;
  const approxCharWidth = fontSize * 0.62; // ~8.7px per char in standard UI sans-serif
  const lineHeight = fontSize * 1.35;

  const maxContentW = role === 'decision' ? 140 : 180;
  const words = label.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (currentLine && testLine.length * approxCharWidth > maxContentW) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const maxLineWidth = Math.max(...lines.map((l) => l.length * approxCharWidth), 40);
  const textBlockHeight = lines.length * lineHeight;

  if (role === 'decision') {
    // Inscribed rectangle of diamond has width W / sqrt(2) and height H / sqrt(2)
    const minW = 160;
    const minH = 84;
    const w = Math.round(Math.max(minW, (maxLineWidth + 48) * 1.35));
    const h = Math.round(Math.max(minH, (textBlockHeight + 36) * 1.35));
    return { w, h, lines, fontSize };
  }

  if (role === 'terminal') {
    const minW = 140;
    const minH = 60;
    const w = Math.round(Math.max(minW, maxLineWidth + 44));
    const h = Math.round(Math.max(minH, textBlockHeight + 32));
    return { w, h, lines, fontSize };
  }

  // Process (rectangle)
  const minW = 150;
  const minH = 64;
  const w = Math.round(Math.max(minW, maxLineWidth + 40));
  const h = Math.round(Math.max(minH, textBlockHeight + 32));
  return { w, h, lines, fontSize };
}

