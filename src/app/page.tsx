'use client'

import rough from 'roughjs'
import { DrawStroke } from '@/lib/utils/drawingUtility/drawStroke';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAppStore, useStroke } from '@/Store/store';
import { RoughGenerator } from 'roughjs/bin/generator';
import { RoughCanvas } from 'roughjs/bin/canvas';
import Toolbar from '@/component/toolbar';
import { OnlyDrawElement, point } from '@/types/type';
import { actionType, elementType } from '@/types/type';
import { handleDrawElement } from '@/lib/handleElement';
import { DrawElements } from '@/lib/utils/drawingUtility/drawElement';
export default function Home() {

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false);
  const generatorRef = useRef<RoughGenerator | null>(null)
  const roughCanvasRef = useRef<RoughCanvas | null>(null);
  const pointerDownRef = useRef<(e: PointerEvent) => void>(undefined)
  const points: point[] = []

  const {
    startingStroke,
    allStrokes,
    currentStroke,
    clearAllStroke,
    continueStroke,
    endStroke
  } = useStroke()
  const {
    setPointerPosition,
    currentTool,
    addElement,
    setSelectedElementId,
    selectedElementId,
    elements,
    setIsDrawing,
    setCurrentTool,
    pointerPosition,
    updateElement
  } = useAppStore()
  const [startCoordinate, setStartCoordinate] = useState<point>([0, 0])
  const [dimension, setdimension] = useState({ width: 0, height: 0 })
  if (selectedElementId)
    console.log(elements)


  const getMOuseCoordinate = (e: React.PointerEvent) => {
    if (canvasRef.current) {
      const rect = canvasRef.current?.getBoundingClientRect();
      const X = e.clientX - rect.left
      const Y = e.clientX - rect.top
      setPointerPosition([X, Y])
    }
  }
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return;
    const context = canvas.getContext("2d")
    if (!context) {
      console.error('Canvas context is null');
      return;
    }
    // const rect = e.currentTarget.getBoundingClientRect();
    const start: point = [e.clientX, e.clientY]
    setStartCoordinate(start)

    if (currentTool.actionType === actionType.Drawing) {
      const element = handleDrawElement(
        {
          action: actionType.Drawing,
          element: currentTool.elementType,
          startPoint: startCoordinate,
          endPoint: startCoordinate,
          stroke: points
        })
      console.log(element, "POinter down check")

      if (element === null) return
      console.log(element.id)
      const elementNew = addElement(element)
      console.log(elementNew)
      setSelectedElementId(element.id)
      if (selectedElementId) console.log(elements[selectedElementId], "from the store")
      DrawElements({ ctx: context, element: element })
      context.save()
    }
    // startingStroke([e.clientX - rect.left, e.clientY - rect.top, e.pressure ?? 1])
  };
  // useEffect(() => {

  //   if (currentTool.actionType !== 'drawing') return

  //   console.log(handlePointerDown, "triggering ")
  //   pointerDownRef.current = handlePointerDown
  //   const listener = (e: PointerEvent) => {
  //     if (pointerDownRef.current) {
  //       pointerDownRef.current(e);
  //     }
  //   };

  //   if (!pointerDownRef) return
  //   window.addEventListener('pointerdown', listener)

  //   return () => {

  //     window.removeEventListener('pointerdown', listener);
  //   };

  // }, [addElement, currentTool, elements, points, selectedElementId, setSelectedElementId, startCoordinate])


  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return
    const canvasBounds = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - canvasBounds.left;
    const y = e.clientY - canvasBounds.top;
    getMOuseCoordinate(e)
    const canvas = canvasRef.current
    if (!canvas) return;
    const context = canvas.getContext("2d")
    if (!context) {
      console.error('Canvas context is null');
      return;
    }




    if (currentTool.actionType === actionType.Drawing) {
      if (!selectedElementId) return
      const element = elements.find(el => el.id === selectedElementId);

      if (!element) return
      console.log(element, "this is the element")

      const updatedElement: OnlyDrawElement = {
        ...element,
        id: selectedElementId,
        width: pointerPosition[0] - element.x,
        height: pointerPosition[1] - element.y
      }


      updateElement(selectedElementId, updatedElement)
      DrawElements({ ctx: context, element: element })
      context.save()
    }





    // const rect = e.currentTarget.getBoundingClientRect();
    const current = { x: e.clientX, y: e.clientY };
    setPointerPosition([x, y])
    // const x = Math.min(startCoordinate.x, current.x);
    // const y = Math.min(startCoordinate.y, current.y);
    const width = Math.abs(current.x - startCoordinate[0]);
    const height = Math.abs(current.y - startCoordinate[1]);
    setdimension({ width: width, height: height })
    // continueStroke([e.clientX - rect.left, e.clientY - rect.top, e.pressure ?? 1])
  };

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false)
    if (!isDrawing.current) return;
    isDrawing.current = false;
    // console.log("Up")



    // if (roughCanvasRef.current && generatorRef.current) {
    //   const rect = generatorRef.current.rectangle(
    //     startCoordinate[0],
    //     startCoordinate[1],
    //     dimension.width,
    //     dimension.height);
    //   roughCanvasRef.current.draw(rect);
    // }

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

    // console.log(allStrokes)

    for (const stroke of allStrokes) {
      DrawStroke(context, stroke.points)
    }

    DrawStroke(context, currentStroke.points)

    context.save()

  }, [currentStroke.points, allStrokes, handlePointerUp])



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
