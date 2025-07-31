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
import { get } from 'http';
export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generatorRef = useRef<RoughGenerator | null>(null);
  const roughCanvasRef = useRef<RoughCanvas | null>(null);
  const pointerDownRef = useRef<(e: PointerEvent) => void>(undefined);
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
    setCurrentTool,
    pointerPosition,
    updateElement,
  } = useAppStore();
  const [startCoordinate, setStartCoordinate] = useState<point>([0, 0]);
  const [dimension, setdimension] = useState({ width: 0, height: 0 });

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

    const start: point = [e.clientX, e.clientY];
    setStartCoordinate(start);
    const initialPoint: point = getMOuseCoordinate(e);

    if (currentTool.actionType === actionType.Drawing) {
      const element = handleDrawElement({
        action: actionType.Drawing,
        element: currentTool.elementType,
        startPoint: initialPoint,
        endPoint: initialPoint,
        stroke: points,
      });
      //

      if (element === null) return;

      addElement(element);
      //
      setSelectedElementId(element.id);
      if (selectedElementId) DrawElements({ ctx: context, element: element });
      context.save();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return

    const [x, y] = getMOuseCoordinate(e);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Canvas context is null');
      return;
    }
    //
    context.clearRect(0, 0, canvas.width, canvas.height);



    if (currentTool.actionType === actionType.Drawing) {
      if (!selectedElementId) return;
      const element = elements.find((el) => el.id === selectedElementId);

      if (!element) return;
      //

      const updatedElement: OnlyDrawElement = {
        ...element,
        id: selectedElementId,
        width: x - element.x,
        height: y - element.y,
      };

      updateElement(selectedElementId, updatedElement);

      elements.forEach((el) => {
        DrawElements({ ctx: context, element: el });
      });

      DrawElements({ ctx: context, element: updatedElement });
      context.save();
    }
  }


  const handlePointerUp = () => {
    setIsDrawing(false);
  }

  useLayoutEffect(() => {
    console.log('useLayoutEffect called');
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
      console.log(el, 'elements from useLayoutEffect');
      DrawElements({ ctx: context, element: el });
    });

    roughCanvasRef.current = rough.canvas(canvas);
    generatorRef.current = roughCanvasRef.current.generator;

    for (const stroke of allStrokes) {
      DrawStroke(context, stroke.points);
    }

    DrawStroke(context, currentStroke.points);

    context.save();
  }, []);

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
