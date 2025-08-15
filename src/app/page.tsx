'use client';

import rough from 'roughjs';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAppStore } from '@/Store/store';
import { RoughGenerator } from 'roughjs/bin/generator';
import { RoughCanvas } from 'roughjs/bin/canvas';
import Toolbar from '@/component/toolbar';
import { OnlyDrawElement, point, PointsFreeHand, Stroke } from '@/types/type';
import { actionType, elementType } from '@/types/type';
import { handleDrawElement } from '@/lib/handleElement';
import { DrawElements } from '@/lib/utils/drawingUtility/drawElement';
import { isPointInsideElement } from '@/lib/utils/drawingUtility/hitTest';
import { DrawBounds } from '@/lib/drawBounds';
import { getBounds } from '@/lib/utils/boundsUtility/getBounds';
import { DragElements } from '@/lib/dragElement';
import { Point } from 'roughjs/bin/geometry';
import { boundType } from '@/lib/utils/boundsUtility/getBounds';


export default function Home() {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    setPointerPosition,
    currentTool,
    addElement,
    setSelectedElementId,
    selectedElementId,
    elements,
    setIsDrawing,
    setIsDragging,
    isDragging,
    isDrawing,
    pointerPosition,
    updateElement,
    setIsSelecting,
    isSelecting
  } = useAppStore();

  const [freehandPoint, setFreehandPoint] = useState<PointsFreeHand[]>([
    [pointerPosition[0], pointerPosition[1], 1],
  ]);
  const [CursorStyle, setCursorStyle] = useState("default")
  const [SelectedElement, setSelectedElement] = useState<OnlyDrawElement | null>(null)
  const [GlobalPointerPosition, setGlobalPointerPosition] = useState<Point | null>(null)
  const generatorRef = useRef<RoughGenerator | null>(null);
  const roughCanvasRef = useRef<RoughCanvas | null>(null);
  const [Bound, setBound] = useState<boundType | null>(null)
  const flagRef = useRef<boolean>(false)
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
    if (actionType.Drawing) setIsDrawing(true);
    if (actionType.Selecting) setIsSelecting(true)
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Canvas context is null');
      return;
    }

    const initialPoint: point = pointerPosition;

    setFreehandPoint([[initialPoint[0], initialPoint[1], 1]]);
    if (currentTool.action === actionType.Drawing) {
      const element = handleDrawElement({
        action: actionType.Drawing,
        element: currentTool.elementType,
        startPoint: initialPoint,
        endPoint: initialPoint,
        stroke: {
          points: [[initialPoint[0], initialPoint[1], 1]],
        },
      });

      if (element === null) return;

      addElement(element);

      setSelectedElementId(element.id);
    }

    if (SelectedElement) {
      setIsDrawing(true)
      setGlobalPointerPosition(pointerPosition)
    }
    if (currentTool.action === actionType.Selecting && !isDragging) {

      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        const flag = isPointInsideElement({ point: pointerPosition, element });
        // console.log(flag, "this is flag ")
        flagRef.current = flag
        if (flag) {
          setSelectedElementId(element.id)
          setSelectedElement(element)
          setIsDragging(true)
          setCursorStyle("grab")
          return
        } else {
          setIsDragging(false)
        }

      }
    }
    if (isDragging && SelectedElement) {
      setBound(getBounds({ element: SelectedElement }))
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    getMOuseCoordinate(e);

    if (!isDrawing || !isSelecting) return;

    const [x, y] = getMOuseCoordinate(e);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Canvas context is null');
      return;
    }

    if (currentTool.action === actionType.Drawing && isDrawing) {
      if (!selectedElementId) return;
      const element = elements.find((el) => el.id === selectedElementId);

      if (!element) return;

      if (element.type === elementType.freehand) {
        setFreehandPoint([
          ...freehandPoint,
          [pointerPosition[0], pointerPosition[1], 1],
        ]);
        const stroke: Stroke = {
          points: freehandPoint,
        };
        const updatedElement: OnlyDrawElement = {
          ...element,
          id: selectedElementId,
          width: x - element.x,
          height: y - element.y,
          stroke: stroke,
        };
        updateElement(selectedElementId, updatedElement);
      }
      else {
        const updatedElement: OnlyDrawElement = {
          ...element,
          id: selectedElementId,
          width: x - element.x,
          height: y - element.y,
        };
        updateElement(selectedElementId, updatedElement);
      }
    }

    // if (currentTool.action === actionType.Selecting && !isDragging) {

    //   for (let i = elements.length - 1; i >= 0; i--) {
    //     const element = elements[i];
    //     const flag = isPointInsideElement({ point: pointerPosition, element });
    //     if (flag) {
    //       setSelectedElementId(element.id)
    //       setSelectedElement(element)
    //       setIsDragging(true)
    //       return
    //     }

    //   }
    // }
    if (isDragging) {
      if (!GlobalPointerPosition) return;
      if (!SelectedElement) return

      const updatedElement = DragElements(
        {
          initialPosition: GlobalPointerPosition,
          currentPosition: pointerPosition,
          element: SelectedElement
        }
      )
      updateElement(SelectedElement.id, updatedElement)
      setBound(getBounds({ element: updatedElement }))
    }

  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    setIsDragging(false)
    // setSelectedElement(null)
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    if (currentTool.action === actionType.Drawing) {
      setCursorStyle("crosshair")

    } else if (isDragging) {
      setCursorStyle("grabbing")

    } else {
      setCursorStyle("default")
    }

    if (SelectedElement && Bound)
      DrawBounds({ context, bounds: Bound })
  }, [Bound, SelectedElement, currentTool.action, isDragging])

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    console.log("cursorStyl", CursorStyle)
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);

    elements.forEach((el) => {
      DrawElements({ ctx: context, element: el });
    });
    roughCanvasRef.current = rough.canvas(canvas);
    generatorRef.current = roughCanvasRef.current.generator;
    context.save();
  });

  return (
    <div className='bg-white relative w-full h-screen'>
      <Toolbar className='absolute top-2 left-2 z-10' />
      <canvas
        ref={canvasRef}
        className={`w-full h-screen `}
        id='canvas'
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          border: '1px solid black',
          cursor: CursorStyle
        }}
      />
    </div>
  );
}
