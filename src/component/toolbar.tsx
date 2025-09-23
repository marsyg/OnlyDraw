import React, { useEffect } from 'react'
import { TOOLBAR_ITEM } from '@/types/toolbarData'
import { useAppStore } from '@/Store/store';
import { actionType, elementType } from '@/types/type';


type ToolbarProps = {
  className?: string;
};
const Toolbar: React.FC<ToolbarProps> = ({ className }) => {
  const { setActiveToolbarId, toolbar, setCurrentTool, setSelectedElementId, setIsDragging, setIsSelecting } = useAppStore()

  const handleClick = (id: string, action: actionType, elementType: elementType) => {
    setActiveToolbarId(id)

    setCurrentTool({ action, elementType })
    if (action === actionType.Selecting) setIsSelecting(true)
    else { setIsSelecting(false) }
    if (action === actionType.Dragging) setIsDragging(true)
    else { setIsDragging(false) }


  }
  return (
    <div className={`flex flex-row space-x-2 border-solid border-2  bg-gray-200 shadow-lg opacity-75 rounded-2xl p-2 border-black border-border  ${className}`}>{
      TOOLBAR_ITEM.map((item, index) => (
        <button key={index}
          onClick={() => handleClick(item.id, item.actionType, item.elementType)}
          className={`hover:bg-gray-400  flex p-1 rounded-sm ${(toolbar.activeToolId === item.id) && ' bg-gray-600'}`} >
          {<item.icon style={{
          }} color='black' />}
        </button>
      ))
    }</div>
  )
}

export default Toolbar