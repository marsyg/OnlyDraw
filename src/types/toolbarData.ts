import {
  SquareIcon,
  CircleIcon,
  MinusIcon,
  PencilIcon,
  MousePointer,
  Scaling,
  Trash,
} from 'lucide-react';
import { actionType, elementType, ToolBarDataType } from './type';

export const TOOLBAR_ITEM: ToolBarDataType[] = [
  {
    id: 'rectangle',
    name: 'rectangle',
    icon: SquareIcon,
    actionType: actionType.Drawing,
    isActive: false,
    elementType: elementType.Rectangle,
  },
  {
    id: 'circle',
    name: 'circle',
    icon: CircleIcon,
    actionType: actionType.Drawing,
    isActive: false,
    elementType: elementType.Ellipse,
  },
  {
    id: 'line',
    name: 'line',
    icon: MinusIcon,
    actionType: actionType.Drawing,
    isActive: false,
    elementType: elementType.Line,
  },
  {
    id: 'freeHand',
    name: 'freeHand',
    icon: PencilIcon,
    actionType: actionType.Drawing,
    isActive: false,
    elementType: elementType.Freehand,
  },
  {
    id: 'select',
    name: 'Select',
    icon: MousePointer,
    isActive: false,
    actionType: actionType.Selecting,
    elementType: elementType.Select,
  },

  {
    id: 'scale',
    name: 'scale',
    icon: Scaling,
    actionType: actionType.Resizing,
    isActive: false,
    elementType: elementType.Select,
  },
  {
    id: 'delete',
    name: 'delete',
    icon: Trash,
    actionType: actionType.Delete,
    isActive: false,
    elementType: elementType.Delete,
  },
];
