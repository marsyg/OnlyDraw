import React from 'react'
import { TOOLBAR_ITEM } from '@/types/toolbarData'
import { useAppStore } from '@/Store/store';


type ToolbarProps = {
  className?: string;
};
const Toolbar: React.FC<ToolbarProps> = ({ className }) => {
  const { setActiveToolbarId, toolbar } = useAppStore()
  const handleClick = (id: string) => {
    setActiveToolbarId(id)
  }
  return (
    <div className={`flex flex-row space-x-2 border-solid border-2  bg-gray-200 shadow-lg opacity-75 rounded-2xl p-2 border-black border-border  ${className}`}>{
      TOOLBAR_ITEM.map((item, index) => (
        <button key={index}
          onClick={() => handleClick(item.id)}
          className={`hover:bg-gray-400  flex p-1 rounded-sm ${(toolbar.activeToolId === item.id) && ' bg-gray-600'}`} >
          {<item.icon style={{

          }} color='black' />}
        </button>
      ))
    }</div>
  )
}

export default Toolbar