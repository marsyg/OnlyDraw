import { AgentState } from '@/Store/store';

interface DrawAgentWorkingOptions {
  ctx: CanvasRenderingContext2D;
  agentState: AgentState;
  camera: { x: number; y: number; scale: number };
  isDark: boolean;
  time?: number;
}

/**
 * Renders an on-canvas holographic blueprint drafting zone and agent cursor
 * directly into the canvas 2D world-space when the agent is working.
 */
export function drawAgentWorking({
  ctx,
  agentState,
  camera,
  isDark,
  time = performance.now(),
}: DrawAgentWorkingOptions): void {
  if (!agentState.isWorking || !agentState.targetBbox) return;

  const { x, y, w, h } = agentState.targetBbox;
  const zoom = Math.max(0.35, Math.min(2.5, camera.scale));
  const invZoom = 1 / zoom;

  ctx.save();

  // ── 1. Drafting Zone Blueprint Background ──────────────────────────────────
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, 14 * invZoom);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fillStyle = isDark ? 'rgba(37, 99, 235, 0.035)' : 'rgba(37, 99, 235, 0.025)';
  ctx.fill();

  // ── 2. Subtle Blueprint Grid ──────────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, 14 * invZoom);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();

  const gridSize = 40;
  ctx.strokeStyle = isDark ? 'rgba(59, 130, 246, 0.07)' : 'rgba(37, 99, 235, 0.06)';
  ctx.lineWidth = 1 * invZoom;
  ctx.setLineDash([3 * invZoom, 6 * invZoom]);
  ctx.lineDashOffset = (time * 0.01) % 9;

  ctx.beginPath();
  // Vertical lines
  for (let gx = x + (gridSize - (x % gridSize)); gx < x + w; gx += gridSize) {
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
  }
  // Horizontal lines
  for (let gy = y + (gridSize - (y % gridSize)); gy < y + h; gy += gridSize) {
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
  }
  ctx.stroke();

  // ── 3. Sweeping Laser Scanner Beam ────────────────────────────────────────
  const scanCycle = (Math.sin(time * 0.0022) + 1) / 2;
  const scanPad = 12 * invZoom;
  const scanY = y + scanPad + scanCycle * (h - scanPad * 2);

  const scanGrad = ctx.createLinearGradient(x, scanY - 20 * invZoom, x, scanY + 20 * invZoom);
  scanGrad.addColorStop(0, 'rgba(59, 130, 246, 0)');
  scanGrad.addColorStop(0.5, isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(37, 99, 235, 0.08)');
  scanGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');

  ctx.fillStyle = scanGrad;
  ctx.fillRect(x, scanY - 20 * invZoom, w, 40 * invZoom);

  // Core laser line
  ctx.beginPath();
  ctx.moveTo(x + 4 * invZoom, scanY);
  ctx.lineTo(x + w - 4 * invZoom, scanY);
  ctx.strokeStyle = isDark ? 'rgba(96, 165, 250, 0.75)' : 'rgba(37, 99, 235, 0.7)';
  ctx.lineWidth = 1.5 * invZoom;
  ctx.setLineDash([]);
  ctx.stroke();

  // ── 4. Ghost Architecture Nodes (Synthesizing Diagram) ────────────────────
  const ghostNodes = [
    { id: 'n1', cx: x + w * 0.2, cy: y + h * 0.45, nw: 110, nh: 48, shape: 'pill', label: 'Input' },
    { id: 'n2', cx: x + w * 0.48, cy: y + h * 0.3, nw: 120, nh: 52, shape: 'rect', label: 'Processing' },
    { id: 'n3', cx: x + w * 0.48, cy: y + h * 0.68, nw: 100, nh: 52, shape: 'diamond', label: 'Validate' },
    { id: 'n4', cx: x + w * 0.8, cy: y + h * 0.45, nw: 110, nh: 48, shape: 'pill', label: 'Output' },
  ];

  // Ghost connections (arrows)
  const connections = [
    { from: ghostNodes[0], to: ghostNodes[1] },
    { from: ghostNodes[0], to: ghostNodes[2] },
    { from: ghostNodes[1], to: ghostNodes[3] },
    { from: ghostNodes[2], to: ghostNodes[3] },
  ];

  ctx.setLineDash([5 * invZoom, 4 * invZoom]);
  ctx.lineDashOffset = -(time * 0.04) % 9;
  ctx.strokeStyle = isDark ? 'rgba(96, 165, 250, 0.4)' : 'rgba(37, 99, 235, 0.35)';
  ctx.lineWidth = 1.2 * invZoom;

  connections.forEach(({ from, to }) => {
    ctx.beginPath();
    ctx.moveTo(from.cx, from.cy);
    ctx.lineTo(to.cx, to.cy);
    ctx.stroke();

    // Pulse dot at junction
    ctx.save();
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(to.cx, to.cy, 2.5 * invZoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Ghost shapes
  ghostNodes.forEach((node, i) => {
    const nodePulse = 0.4 + 0.35 * Math.sin(time * 0.0035 + i);
    ctx.save();
    ctx.strokeStyle = isDark ? `rgba(96, 165, 250, ${nodePulse})` : `rgba(37, 99, 235, ${nodePulse})`;
    ctx.fillStyle = isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(37, 99, 235, 0.04)';
    ctx.lineWidth = 1.4 * invZoom;
    ctx.setLineDash([6 * invZoom, 4 * invZoom]);
    ctx.lineDashOffset = (time * 0.02 + i * 4) % 10;

    const nx = node.cx - node.nw / 2;
    const ny = node.cy - node.nh / 2;

    if (node.shape === 'pill') {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(nx, ny, node.nw, node.nh, node.nh / 2);
      } else {
        ctx.rect(nx, ny, node.nw, node.nh);
      }
      ctx.fill();
      ctx.stroke();
    } else if (node.shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(node.cx, ny);
      ctx.lineTo(nx + node.nw, node.cy);
      ctx.lineTo(node.cx, ny + node.nh);
      ctx.lineTo(nx, node.cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(nx, ny, node.nw, node.nh, 8 * invZoom);
      } else {
        ctx.rect(nx, ny, node.nw, node.nh);
      }
      ctx.fill();
      ctx.stroke();
    }

    // Ghost label
    const labelFontSize = 10 * invZoom;
    ctx.font = `600 ${labelFontSize}px sans-serif`;
    ctx.fillStyle = isDark ? `rgba(228, 228, 231, ${nodePulse})` : `rgba(39, 39, 42, ${nodePulse})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, node.cx, node.cy);

    ctx.restore();
  });

  ctx.restore(); // restore clip

  // ── 5. Perimeter Marching Ants Border ─────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, 14 * invZoom);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.setLineDash([8 * invZoom, 6 * invZoom]);
  ctx.lineDashOffset = -(time * 0.035) % 14;
  ctx.strokeStyle = isDark ? 'rgba(59, 130, 246, 0.65)' : 'rgba(37, 99, 235, 0.6)';
  ctx.lineWidth = 1.5 * invZoom;
  ctx.stroke();
  ctx.restore();

  // ── 6. Corner Cybernetic Reticles [ ⌝ ⌞ ⌟ ] ──────────────────────────────
  const reticleLen = 22 * invZoom;
  const reticleOffset = 3 * invZoom;
  ctx.save();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2.5 * invZoom;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(x - reticleOffset, y + reticleLen);
  ctx.lineTo(x - reticleOffset, y - reticleOffset);
  ctx.lineTo(x + reticleLen, y - reticleOffset);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(x + w + reticleOffset - reticleLen, y - reticleOffset);
  ctx.lineTo(x + w + reticleOffset, y - reticleOffset);
  ctx.lineTo(x + w + reticleOffset, y + reticleLen);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(x - reticleOffset, y + h - reticleLen);
  ctx.lineTo(x - reticleOffset, y + h + reticleOffset);
  ctx.lineTo(x + reticleLen, y + h + reticleOffset);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(x + w + reticleOffset - reticleLen, y + h + reticleOffset);
  ctx.lineTo(x + w + reticleOffset, y + h + reticleOffset);
  ctx.lineTo(x + w + reticleOffset, y + h + reticleOffset - reticleLen);
  ctx.stroke();

  ctx.restore();

  // ── 7. Autonomous Agent Pen Cursor & Spark Trail ──────────────────────────
  const t = time * 0.0016;
  const curX = x + w * 0.5 + Math.sin(t) * (w * 0.36);
  const curY = y + h * 0.5 + Math.sin(t * 1.8) * (h * 0.3);

  // Stardust trail
  ctx.save();
  for (let i = 1; i <= 6; i++) {
    const pastT = t - i * 0.06;
    const px = x + w * 0.5 + Math.sin(pastT) * (w * 0.36);
    const py = y + h * 0.5 + Math.sin(pastT * 1.8) * (h * 0.3);
    const sparkAlpha = (1 - i / 7) * 0.6;
    const sparkRadius = (4 - i * 0.5) * invZoom;

    ctx.fillStyle = `rgba(96, 165, 250, ${sparkAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1, sparkRadius), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Draw Cursor Pointer
  ctx.save();
  ctx.translate(curX, curY);

  // SVG-style crisp cursor path
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 15 * invZoom);
  ctx.lineTo(4 * invZoom, 11 * invZoom);
  ctx.lineTo(9 * invZoom, 17 * invZoom);
  ctx.lineTo(12 * invZoom, 15 * invZoom);
  ctx.lineTo(7 * invZoom, 9 * invZoom);
  ctx.lineTo(12 * invZoom, 9 * invZoom);
  ctx.closePath();
  ctx.fillStyle = '#2563eb';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5 * invZoom;
  ctx.stroke();

  // Collaborative Agent Label Tag
  const tagText = '✦ OnlyDraw Agent';
  const tagFontSize = 11 * invZoom;
  ctx.font = `600 ${tagFontSize}px sans-serif`;
  const tagTextWidth = ctx.measureText(tagText).width;
  const tagH = 20 * invZoom;
  const tagW = tagTextWidth + 24 * invZoom;
  const tagX = 14 * invZoom;
  const tagY = 8 * invZoom;

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(tagX, tagY, tagW, tagH, tagH / 2);
  } else {
    ctx.rect(tagX, tagY, tagW, tagH);
  }
  ctx.fillStyle = isDark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
  ctx.lineWidth = 1 * invZoom;
  ctx.stroke();

  // Pulsing live dot
  const beaconPulse = 0.5 + 0.5 * Math.sin(time * 0.008);
  ctx.beginPath();
  ctx.arc(tagX + 8 * invZoom, tagY + tagH / 2, 3 * invZoom, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(16, 185, 129, ${beaconPulse})`;
  ctx.fill();

  // Label text
  ctx.fillStyle = isDark ? '#f4f4f5' : '#18181b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, tagX + 16 * invZoom, tagY + tagH / 2);

  ctx.restore();

  // ── 8. Floating Status Header Badge at Top of Drafting Box ─────────────────
  const stageLabels: Record<string, string> = {
    intent: 'Classifying diagram intent & context...',
    planning: 'Computing graph topology & auto-layout...',
    compiling: 'Synthesizing sketchy vectors & labels...',
    rendering: 'Placing & rendering diagram on canvas...',
  };
  const currentStageText = stageLabels[agentState.stage] || 'Synthesizing diagram...';

  const badgeText = `✦ OnlyDraw Agent · ${currentStageText}`;
  const badgeFontSize = 11 * invZoom;
  ctx.font = `600 ${badgeFontSize}px sans-serif`;
  const badgeTextWidth = ctx.measureText(badgeText).width;
  const badgeH = 24 * invZoom;
  const badgeW = badgeTextWidth + 20 * invZoom;
  const badgeX = x + 10 * invZoom;
  const badgeY = y - badgeH - 8 * invZoom;

  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6 * invZoom);
  } else {
    ctx.rect(badgeX, badgeY, badgeW, badgeH);
  }
  ctx.fillStyle = isDark ? 'rgba(24, 24, 27, 0.94)' : 'rgba(255, 255, 255, 0.94)';
  ctx.fill();
  ctx.strokeStyle = isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(37, 99, 235, 0.4)';
  ctx.lineWidth = 1 * invZoom;
  ctx.stroke();

  ctx.fillStyle = isDark ? '#60a5fa' : '#2563eb';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + 10 * invZoom, badgeY + badgeH / 2);
  ctx.restore();

  ctx.restore();
}

