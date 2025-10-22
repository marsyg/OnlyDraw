'use client';

import rough from 'roughjs';

import { useEffect, useRef, useState } from 'react';
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
import canvasDoc from '@/Store/yjs-store';
import * as Y from 'yjs';
import { Point } from 'roughjs/bin/geometry';
import { boundType } from '@/lib/utils/boundsUtility/getBounds';
import createYElement from '@/lib/utils/createYElement';


export default function App() {
  const { doc, yElement, order } = canvasDoc;
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
  const [selectedYElement, setSelectedYElement] = useState<Y.Map<unknown> | null>(null)
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
    console.log("cp ---->1 ")
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Canvas context is null');
      return;
    }

    const initialPoint: point = pointerPosition;
    console.log("cp ---->2 ")
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
      console.log("cp ---->3 ,  ", element)
      if (element === null) return;

      try {
        if (!doc) throw new Error("Y.Doc is not initialized");
        doc.transact(() => {
          const newYElement = createYElement(element);
          // setSelectedYElement(newYElement)
          // console.log("created y element successfully", newYElement.toJSON())
        })

      } catch (error) {
        console.log("error in creating y element", error)
      }
      addElement(element);
      console.log("cp ---->4 , after ADDING ELEMENT ")

      setSelectedElementId(element.id);
      if (element.id) {
        setIsDrawing(true)
        setGlobalPointerPosition(pointerPosition)
      }
    }

    console.log(selectedElementId)
    if (selectedElementId) {
      console.log("are elements here")
      setIsDrawing(true)
      setGlobalPointerPosition(pointerPosition)
    }
    if (flagRef.current) {
      setIsDragging(true)
      console.log("is dragging set to true")
    }

  };

  const handlePointerMove = (e: React.PointerEvent) => {

    getMOuseCoordinate(e);
    if (currentTool.action === actionType.Selecting && !isDragging) {

      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        const flag = isPointInsideElement({ point: pointerPosition, element });
        console.log("Element ID:", element.id, "Flag:", flag);
        //checked this working perfectly fine
        flagRef.current = flag

        if (flag) {
          console.log("Found element under pointer")
          setSelectedElementId(element.id)
          setSelectedElement(element)
          setCursorStyle("grab")
          console.log("Selected Element ID:", selectedElementId);
          console.log("Cursor Style:", CursorStyle);

          // console.log("Pointer:", pointerPosition);
          // console.log("Element bottom-right:", [element.x + element.width, element.y + element.height]);

          const threshold = 10;
          const cornerX = element.x + element.width;
          const cornerY = element.y + element.height;
          const dx = pointerPosition[0] - cornerX;
          const dy = pointerPosition[1] - cornerY;

          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= threshold) {
            setCursorStyle("se-resize")
          }
          break;
        }

        else {
          setSelectedElement(null)
          setCursorStyle("default")
        }
      }
    }

    if (!isDrawing && !isSelecting) return;

    const [x, y] = getMOuseCoordinate(e);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Canvas context is null');
      return;
    }


    if (currentTool.action === actionType.Drawing) {

      // TODO change the logic  that uses selectedElement rather than selectedElementId 
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
        updateElement(selectedElementId, updatedElement)
        if (!selectedYElement) return;
        // selectedYElement.set("width", updatedElement.width)
        // selectedYElement.set("height", updatedElement.height)
        // selectedYElement.set("stroke", updatedElement.stroke)
        ;
      }

      else {
        const updatedElement: OnlyDrawElement = {
          ...element,
          id: selectedElementId,
          width: x - element.x,
          height: y - element.y,
        };
        updateElement(selectedElementId, updatedElement);
        if (!selectedYElement) return;
        // selectedYElement.set("width", updatedElement.width)
        // selectedYElement.set("height", updatedElement.height)      

      }
    }

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

  const handlePointerUp = (e: React.PointerEvent) => {
    flagRef.current = false
    setIsDrawing(false);
    setIsDragging(false)
    setSelectedElement(null)
    setGlobalPointerPosition(null)
    const target = e.target as HTMLElement
    if (target.hasPointerCapture && target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }
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
    // console.log(currentTool)
    // console.log("is draging", isDragging)

  }, [currentTool, isDragging,]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    if (SelectedElement && Bound) {
      DrawBounds({ context, bounds: Bound })
    }
  }, [SelectedElement, Bound]);

  useEffect(() => {
    yElement.forEach((element, key) => {
      console.log('Y.Element Key:', key, 'Value:', element.toJSON());
    })
    if (yElement.size) {
      console.log("Y.Element size:", yElement.size);
    }
    type YElement = Y.Map<unknown>;
    type YElementsMap = Y.Map<YElement>;
    type YElementsObserver = (event: Y.YMapEvent<YElement>) => void;

    const observer: YElementsObserver = (event) => {
      event.target.forEach((element: YElement, key: string) => {
        console.log('Y.Element Key:', key, 'Value:', element.toJSON());
      });
    }

    canvasDoc.yElement.observe(observer);
    return () => {
      canvasDoc.yElement.unobserve(observer);

    }
  }, [canvasDoc.yElement]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }


    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);
    console.log("in use layout effect")
    elements.forEach((el) => {
      DrawElements({ ctx: context, element: el });
    });
    roughCanvasRef.current = rough.canvas(canvas);
    generatorRef.current = roughCanvasRef.current.generator;
    context.save();
  }, [elements]);

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
