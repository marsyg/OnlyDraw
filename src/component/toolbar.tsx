import React from 'react'
import { TOOLBAR_ITEM } from '@/types/toolbarData'


type ToolbarProps = {
  className?: string;
};
const Toolbar: React.FC<ToolbarProps> = ({ className }) => {
  const handleClick = () => {

  }
  return (
    <div className={`flex flex-row space-x-2 border-8 border-black border-border  ${className}`}>{
      TOOLBAR_ITEM.map((item, index) => (
        <button key={index}
          onClick={handleClick}
        >
          {<item.icon />}
        </button>
      ))
    }</div>
  )
}

export default Toolbar