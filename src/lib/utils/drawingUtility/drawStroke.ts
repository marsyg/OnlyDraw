import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from '@/lib/utils/drawingUtility/getSVGStroke';
export const DrawStroke  = ( ctx : CanvasRenderingContext2D  , strokePoints  : [number , number , number][]) => {

    const stroke = getStroke(strokePoints)
    const path = getSvgPathFromStroke(stroke)
    ctx.fillStyle = "black"; 
    ctx.fill(new Path2D(path));
     
}