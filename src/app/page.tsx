'use client'

import rough from 'roughjs'
import { DrawStroke } from '@/lib/utils/drawingUtility/drawStroke';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useAppStore, useStroke } from '@/Store/store';
import { RoughGenerator } from 'roughjs/bin/generator';
import { RoughCanvas } from 'roughjs/bin/canvas';
import Toolbar from '@/component/toolbar';
export default function Home() {
  type coordinate = {
    x: number,
    y: number,
  }
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false);
  const generatorRef = useRef<RoughGenerator | null>(null)
  const roughCanvasRef = useRef<RoughCanvas | null>(null);



  const { startingStroke, allStrokes, currentStroke, clearAllStroke, continueStroke, endStroke } = useStroke()
  const { setPointerPosition } = useAppStore()
  const [startCoordinate, setStartCoordinate] = useState<coordinate>({ x: 0, y: 0 })
  const [dimension, setdimension] = useState({ width: 0, height: 0 })

  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    console.log("Up")


    if (roughCanvasRef.current && generatorRef.current) {
      const rect = generatorRef.current.rectangle(
        startCoordinate.x,
        startCoordinate.y,
        dimension.width,
        dimension.height);
      roughCanvasRef.current.draw(rect);
    }

    // endStroke();

  }, [startCoordinate, dimension])

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



    roughCanvasRef.current = rough.canvas(canvas);
    generatorRef.current = roughCanvasRef.current.generator;

    console.log(allStrokes)

    for (const stroke of allStrokes) {
      DrawStroke(context, stroke.points)
    }

    DrawStroke(context, currentStroke.points)

    context.save()

  }, [currentStroke.points, allStrokes, handlePointerUp])


  // const getMOuseCoordinate = (e: React.PointerEvent) => {
  //   // const rect = e.currentTarget.getBoundingClientRect();
  //   const X = e.clientX - rect.left
  //   const Y = e.clientX - rect.top
  //   return { X, Y }
  // }

  const handlePointerDown = (e: React.PointerEvent) => {

    isDrawing.current = true;
    console.log(e, "handlePointerDown")
    // const rect = e.currentTarget.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY };
    setStartCoordinate(start)
    // startingStroke([e.clientX - rect.left, e.clientY - rect.top, e.pressure ?? 1])
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvasBounds = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - canvasBounds.left;
    const y = e.clientY - canvasBounds.top;
    if (!isDrawing.current) return
    console.log(e, "handlePointerMove")
    // const rect = e.currentTarget.getBoundingClientRect();
    const current = { x: e.clientX, y: e.clientY };
    setPointerPosition([x, y])
    // const x = Math.min(startCoordinate.x, current.x);
    // const y = Math.min(startCoordinate.y, current.y);
    const width = Math.abs(current.x - startCoordinate.x);
    const height = Math.abs(current.y - startCoordinate.y);
    setdimension({ width: width, height: height })
    // continueStroke([e.clientX - rect.left, e.clientY - rect.top, e.pressure ?? 1])
  };
  return (
    <div className='bg-white relative w-full h-screen'>
      <Toolbar className='absolute top-2 left-2 z-10'></Toolbar>

      <canvas
        ref={canvasRef}
        className='w-full h-screen' id="canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}

        style={{ border: '1px solid black' }}>
      </canvas>
    </div>
  );
}
