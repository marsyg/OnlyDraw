'use client';

import rough from 'roughjs';
import { DrawStroke } from '@/lib/utils/drawingUtility/drawStroke';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useAppStore, useStroke } from '@/Store/store';
import { RoughGenerator } from 'roughjs/bin/generator';
import { RoughCanvas } from 'roughjs/bin/canvas';
import Toolbar from '@/component/toolbar';
import { OnlyDrawElement, point } from '@/types/type';
import { actionType, elementType } from '@/types/type';
import { handleDrawElement } from '@/lib/handleElement';
import { DrawElements } from '@/lib/utils/drawingUtility/drawElement';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generatorRef = useRef<RoughGenerator | null>(null);
  const roughCanvasRef = useRef<RoughCanvas | null>(null);

  const points: point[] = [];

  const {
    startingStroke,
    allStrokes,
    currentStroke,
    clearAllStroke,
    continueStroke,
    endStroke,
  } = useStroke();
  const {
    setPointerPosition,
    currentTool,
    addElement,
    setSelectedElementId,
    selectedElementId,
    elements,
    setIsDrawing,
    isDrawing,
    pointerPosition,
    updateElement,
  } = useAppStore();


  const getMOuseCoordinate = (e: React.PointerEvent) => {
    if (canvasRef.current) {
      const rect = canvasRef.current?.getBoundingClientRect();
      const X = e.clientX - rect.left;
      const Y = e.clientY - rect.top;
      setPointerPosition([X, Y]);
    }
    return pointerPosition;
  };


  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Canvas context is null');
      return;
    }


    const initialPoint: point = pointerPosition
    console.log(initialPoint, "this is the initial Point ")

    if (currentTool.actionType === actionType.Drawing) {
      const element = handleDrawElement({
        action: actionType.Drawing,
        element: currentTool.elementType,
        startPoint: initialPoint,
        endPoint: initialPoint,
        stroke: points,
      });
      console.log(element, "this is the element on intialization")


      if (element === null) return;

      addElement(element);

      setSelectedElementId(element.id);

    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    getMOuseCoordinate(e)
    console.log(getMOuseCoordinate(e), "this the pointer ")
    if (!isDrawing) return

    const [x, y] = getMOuseCoordinate(e);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Canvas context is null');
      return;
    }



    if (currentTool.actionType === actionType.Drawing && isDrawing) {
      if (!selectedElementId) return;
      const element = elements.find((el) => el.id === selectedElementId);

      if (!element) return;


      const updatedElement: OnlyDrawElement = {
        ...element,
        id: selectedElementId,
        width: x - element.x,
        height: y - element.y,
      };

      updateElement(selectedElementId, updatedElement);



    }
  }


  const handlePointerUp = () => {
    setIsDrawing(false);
    console.log(pointerPosition, "this si the point after we Pointer is moved up ")
  }

  useLayoutEffect(() => {

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);

    elements.forEach((el) => {
      // console.log(el, "element printed")
      DrawElements({ ctx: context, element: el });
    });
    // console.log(elements)
    roughCanvasRef.current = rough.canvas(canvas);
    generatorRef.current = roughCanvasRef.current.generator;


    context.save();
  },);

  return (
    <div className='bg-white relative w-full h-screen'>
      <Toolbar className='absolute top-2 left-2 z-10'></Toolbar>

      <canvas
        ref={canvasRef}
        className='w-full h-screen'
        id='canvas'
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ border: '1px solid black' }}
      ></canvas>
    </div>
  );
}
