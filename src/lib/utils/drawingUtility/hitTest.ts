import { elementType } from '@/types/type'
import { args } from '../hitTest/argumentType'
import { ElementType } from 'react'
import { isInsideRectangle } from '../hitTest/rectangle'
import { isInsideEllipse } from '../hitTest/ellipse'
import { isNearLine } from '../hitTest/line'
export const isPointInsideElement = ({point , element } :args) =>{
   switch(element.type) {
    case  elementType.Rectangle :{
        return isInsideRectangle({point ,element})
    }
     case elementType.ellipse :{
        return isInsideEllipse({ point, element });
     }
     case elementType.line : {
      return isNearLine({ point, element });
     }
     case elementType.freehand : {
        
     }
   }

    
} 