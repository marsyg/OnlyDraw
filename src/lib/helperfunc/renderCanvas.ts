// const renderCanvas = (
//   canvasRef,
//   yElement,
//   DrawElements,
//   selectedYElement,
//   DrawBounds,
//   Bound
// ) => {
//   const canvas = canvasRef.current;
//   if (!canvas) return;
//   const ctx = canvas.getContext('2d');
//   if (!ctx) return;

//   ctx.clearRect(0, 0, canvas.width, canvas.height);

//   yElement.forEach((el) => {
//     DrawElements({ ctx, element: el });
//   });

//   // Optional: draw bound on top of everything
//   if (selectedYElement && Bound) {
//     DrawBounds({ context: ctx, bounds: Bound });
//   }
// };
