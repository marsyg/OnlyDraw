import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Settings2, Minus, Plus, Check } from 'lucide-react'; // You might need to install lucide-react or use your own icons
import { ToolBarDataType } from '@/types/type';
import { TOOLBAR_ITEM } from '@/types/toolbarData';
import { BoundaryStyle, FillStyle, useAppStore } from '@/Store/store';
import { actionType, elementType } from '@/types/type';

// --- Helper Functions ---
const getRoughnessLabel = (value: number) => {
  if (value < 10) return "Smooth";
  if (value < 35) return "Shaky";
  if (value < 65) return "Wobbly";
  if (value < 90) return "Rough";
  return "Chaotic";
};

// --- Updated Modern Styles ---
const RoughStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap');

    .sketch-font {
      font-family: 'Kalam', cursive;
    }

    /* Dark "Neobrutalist" Base */
    .modern-panel {
      background-color: #6c242c;             /* Dark surface */
      border: 1px solid #262b36;             /* Subtle dark border */
      box-shadow: 10px 10px 0px 0px #000;    /* Hard dark shadow */
      border-radius: 12px;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      color: #e5e7eb;
    }

    /* Action Items */
    .rough-btn {
      border: 1px solid #334155;
      border-radius: 8px;
      transition: all 0.15s ease;
      background: #1f2937;                   /* slate-800 */
      color: #e5e7eb;                        /* light text */
    }
    .rough-btn:hover {
      background: #2b3442;                   /* slightly lighter */
      border-color: #475569;
    }
    .rough-btn.active {
      background: #0b1320;
      border: 2px solid #3b82f6;             /* blue-500 */
      color: #bfdbfe;                         /* blue-200 */
      box-shadow: 3px 3px 0px 0px #1e3a8a;    /* deep blue shadow */
      transform: translate(-1px, -1px);
    }

    /* Custom Range Slider (Dark) */
    .modern-slider {
      -webkit-appearance: none;
      width: 100%;
      height: 4px;
      background: #222733;                   /* dark track */
      border-radius: 2px;
      outline: none;
    }
    .modern-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #e5e7eb;                   /* light thumb */
      cursor: pointer;
      border: 2px solid #0f1115;             /* blends with panel */
      box-shadow: 0 0 0 1px #111827;         /* subtle ring */
      transition: transform 0.1s, background 0.1s;
    }
    .modern-slider::-webkit-slider-thumb:hover {
      transform: scale(1.15);
      background: #ffffff;
    }

    /* Scrollbar cleanup */
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}</style>
);

export default function RoughSketchToolbox() {

  const [isExpanded, setIsExpanded] = useState(true);
  const [target, setTarget] = useState<string | null>(null);

  // Store
  const {
    strokeColor, setActiveToolbarId, toolbar, setCurrentTool, setIsDragging, setIsSelecting, setStrokeColor,
    fillColor, setFillColor, isFillTransparent, setIsFillTransparent, strokeWidth, setStrokeWidth,
    setRoughness, fillStyle, setFillStyle, fillWeight, setFillWeight, roughness,
    boundaryStyle, setBoundaryStyle, hasShadow, setHasShadow, opacity, setOpacity, rotation, setRotation
  } = useAppStore();

  const colorRef = useRef<HTMLInputElement | null>(null);

  // Constants
  const swatches = ["#e03131", "#fab005", "#40c057", "#1c7ed6", "#7048e8", "#1a1a1a"];
  const fillStyles = [
    { id: "solid", label: "Solid" },
    { id: "hachure", label: "Hachure" },
    { id: "dots", label: "Dots" },
    { id: "zigzag", label: "ZigZag" },
  ];
  const boundaryStyles = [
    { id: "solid", label: "Solid" },
    { id: "dashed", label: "Dashed" },
    { id: "dotted", label: "Dotted" },
  ];

  // Handlers
  const handleClick = (id: string, action: actionType, elementType: elementType) => {
    setActiveToolbarId(id);
    setCurrentTool({ action, elementType });
    setIsSelecting(action === actionType.Selecting);
    setIsDragging(action === actionType.Dragging);
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value;
    if (target === "stroke") setStrokeColor(value);
    if (target === "fill") setFillColor(value);
  };

  const openPicker = (type: string | null) => {
    setTarget(type);
    colorRef.current?.click();
  };

  return (
    <>
      <RoughStyles />

      
      <motion.div
        layout
        className="fixed top-4 left-4 z-50 sketch-font modern-panel flex flex-col select-none overflow-hidden"
        style={{ width: isExpanded ? '280px' : '60px' }}
        initial={false}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >

        
        <div className={`flex ${isExpanded ? 'flex-row flex-wrap p-3 gap-2 justify-between items-center' : 'flex-col p-2 gap-3 items-center'}`}>

         
          {!isExpanded && (
            <div className="mb-2">
              <motion.button
                onClick={() => setIsExpanded(true)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 transition-colors"
              >
                <Settings2 size={18} />
              </motion.button>
            </div>
          )}

         
          <div className={`grid ${isExpanded ? 'grid-cols-4 gap-2 w-full' : 'flex flex-col gap-2'}`}>
            {TOOLBAR_ITEM.map((item) => {
              
              if (!isExpanded && toolbar.activeToolId !== item.id) return null;

              return (
                <motion.button
                  key={item.id}
                  className={`rough-btn flex items-center justify-center ${isExpanded ? 'h-10 w-full text-xl' : 'h-10 w-10 text-xl'} ${toolbar.activeToolId === item.id ? 'active' : ''}`}
                  onClick={() => {
                    handleClick(item.id, item.actionType, item.elementType)
                    if (!isExpanded) setIsExpanded(true); 
                  }}
                  whileTap={{ scale: 0.95 }}
                  title={item.id}
                >
                  {React.createElement(item.icon)}
                </motion.button>
              )
            })}

            {!isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-xs text-gray-400 mt-1 hover:text-black"
              >
                +
              </button>
            )}
          </div>

          {isExpanded && (
            <motion.button
              className="w-full mt-2 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-gray-200"
              onClick={() => setIsExpanded(false)}
              whileHover={{ scale: 1.02 }}
            >
              <ChevronUp size={16} />
              <span className="ml-1 text-[10px] uppercase font-bold tracking-wider">Hide Properties</span>
            </motion.button>
          )}
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t-2 border-gray-800 bg-[#0f1115] overflow-y-auto max-h-[70vh] no-scrollbar"
            >
              <div className="p-4 space-y-5">


                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-100">Stroke</label>
                    <div className="flex items-center gap-2">
                      <input ref={colorRef} type="color" hidden onChange={handleChange} />
                      <button
                        className="w-8 h-8 rounded-full border-2 border-gray-700 shadow-sm active:scale-95 transition-transform"
                        style={{ backgroundColor: strokeColor }}
                        onClick={() => openPicker('stroke')}
                      />
                      <div className="flex flex-wrap gap-1">
                        {swatches.slice(0, 3).map(c => (
                          <button key={c} onClick={() => setStrokeColor(c)} style={{ backgroundColor: c }} className="w-4 h-4 rounded-full border border-gray-700" />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-100">Fill</label>
                    <div className="flex items-center gap-2">
                      <button
                        className="w-8 h-8 rounded-full border-2 border-gray-700 shadow-sm relative overflow-hidden active:scale-95 transition-transform"
                        style={{ backgroundColor: isFillTransparent ? '#0f1115' : fillColor }}
                        onClick={() => openPicker('fill')}
                      >
                        {isFillTransparent && <div className="absolute inset-0 bg-red-500/30 rotate-45 w-[2px] mx-auto h-full"></div>}
                      </button>
                      <button
                        onClick={() => setIsFillTransparent(!isFillTransparent)}
                        className={`text-xs p-1 rounded border ${isFillTransparent ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-900 text-gray-200 border-gray-700 hover:border-gray-500'}`}
                      >
                        {isFillTransparent ? 'None' : 'Fill'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-gray-900 p-3 rounded-lg border border-gray-800">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-xs font-bold text-gray-100">Thickness</label>
                      <span className="text-[10px] text-gray-200">{strokeWidth}px</span>
                    </div>
                    <input
                      type="range" min="1" max="30"
                      value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="modern-slider"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-xs font-bold text-gray-100">Sloppiness</label>
                      <span className="text-[10px] text-gray-300">{getRoughnessLabel(roughness)}</span>
                    </div>
                    <input
                      type="range" min="0" max="50"
                      value={roughness} onChange={(e) => setRoughness(Number(e.target.value))}
                      className="modern-slider"
                    />
                  </div>
                </div>


                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-100">Fill Pattern</label>
                    <div className="grid grid-cols-4 gap-1">
                      {fillStyles.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setFillStyle(s.id as FillStyle)}
                          className={`text-[10px] py-1 px-1 rounded border ${fillStyle === s.id ? 'bg-black text-white border-gray-700' : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-gray-500'}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {fillStyle !== 'solid' && (
                    <div className="pt-2">
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-gray-100">Pattern Density</label>
                        <span className="text-[10px] text-gray-300">{fillWeight}</span>
                      </div>
                      <input
                        type="range" min="2" max="40"
                        value={fillWeight} onChange={(e) => setFillWeight(Number(e.target.value))}
                        className="modern-slider"
                      />
                    </div>
                  )}

                  <div className="space-y-1 pt-2 border-t border-gray-700">
                    <label className="text-[10px] uppercase font-bold text-gray-100">Line Style</label>
                    <div className="flex gap-2">
                      {boundaryStyles.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setBoundaryStyle(s.id as BoundaryStyle)}
                          className={`flex-1 py-1 text-[10px] rounded border ${boundaryStyle === s.id
                            ? 'bg-blue-900/30 border-blue-500 text-blue-300'
                            : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                            }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>


                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-100 flex items-center gap-2">
                      <input type="checkbox" checked={hasShadow} onChange={e => setHasShadow(e.target.checked)} className="accent-blue-500 rounded w-4 h-4" />
                      Drop Shadow
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-gray-100">Opacity</label>
                      <input
                        type="number" max="100" min="0"
                        value={Math.round(opacity * 100)}
                        onChange={e => setOpacity(Number(e.target.value) / 100)}
                        className="w-12 text-right bg-gray-800 text-gray-100 border-none rounded text-xs p-1"
                      />
                      <span className="text-xs text-gray-300">%</span>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}