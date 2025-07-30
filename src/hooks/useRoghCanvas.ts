import  { useRef, useEffect } from 'react';
import rough from 'roughjs/bin/rough';
import type { RoughCanvas } from 'roughjs/bin/canvas';

const useRoughCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const roughCanvasRef = useRef<RoughCanvas | null>(null);
  const generatorRef = useRef<ReturnType<(typeof rough)['generator']> | null>(
    null
  );

  useEffect(() => {
    if (canvasRef.current) {
      const rc = rough.canvas(canvasRef.current);
      roughCanvasRef.current = rc;
      generatorRef.current = rc.generator;
    }
  }, []);

  return {
    canvasRef,
    roughCanvas: roughCanvasRef,
    generator: generatorRef,
  };
};

export default useRoughCanvas;
