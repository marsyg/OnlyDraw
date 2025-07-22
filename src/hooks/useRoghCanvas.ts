import React, { useRef, useEffect } from 'react';
import rough from 'roughjs/bin/rough';

const useRoughCanvas = () => {
  const canvasRef = useRef(null);
  const roughCanvasRef = useRef(null);
  const generatorRef = useRef(null);

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
