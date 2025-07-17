'use client'
import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from '@/lib/utills/drawingUtility/getSVGStroke';
import rough from 'roughjs'
import { useEffect } from 'react';
import { useDraw } from '@/Store/store';
export default function Home() {
  const { points, setPoint, addPoint } = useDraw()
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  if (!context) {
    console.error('Canvas context is null');
    return;
  }


  const options = {
    size: 32,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,

  };



  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPoint([[e.clientX - rect.left, e.clientY - rect.top, e.pressure ?? 1]]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    addPoint([e.clientX - rect.left, e.clientY - rect.top, e.pressure ?? 1]);
  };
  const stroke = getStroke(points as [number, number, number][], options)
  const path = getSvgPathFromStroke(stroke)
  context.fill(new Path2D(path));



  return (
    <div className='bg-white w-full h-screen'>
      <canvas className='w-full h-screen' id="canvas" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
        style={{ touchAction: "none" }}>
        {points && <path d={path} fill="none" stroke="black" strokeWidth={2} />}
      </canvas>
    </div>
  );
}
