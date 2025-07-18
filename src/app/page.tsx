'use client'
import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from '@/lib/utils/drawingUtility/getSVGStroke';
import rough from 'roughjs'
import { DrawStroke } from '@/lib/utils/drawingUtility/drawStroke';
import { useLayoutEffect, useRef } from 'react';
import { useDraw, useStroke } from '@/Store/store';
export default function Home() {

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { startingStroke, allStrokes, currentStroke, clearAllStroke, continueStroke, endStroke } = useStroke()



  const options = {
    size: 32,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,

  };

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return;

    const context = canvas.getContext("2d")
    if (!context) {
      console.error('Canvas context is null');
      return;
    }
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);
    console.log(allStrokes)
    for (const stroke of allStrokes) {
      DrawStroke(context, stroke.points)
      
    }



    DrawStroke(context, currentStroke.points)
    
    context.save()
  }, [currentStroke.points, allStrokes])
  const handlePointerUp = () => {
    endStroke();

  }
  const handlePointerDown = (e: React.PointerEvent) => {
    console.log(e, "handlePointerDown")
    const rect = e.currentTarget.getBoundingClientRect();
    startingStroke([e.clientX - rect.left, e.clientY - rect.top, e.pressure ?? 1])
    
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    console.log(e, "handlePointerMove")
    const rect = e.currentTarget.getBoundingClientRect();
    continueStroke([e.clientX - rect.left, e.clientY - rect.top, e.pressure ?? 1])
   
  };



  return (
    <div className='bg-white w-full h-screen'>
      <canvas
        ref={canvasRef}
        className='w-full h-screen' id="canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ touchAction: "none" }}>
      </canvas>
    </div>
  );
}
