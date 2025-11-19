import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolBarDataType } from '@/types/type';
import { TOOLBAR_ITEM } from '@/types/toolbarData';
import { BoundaryStyle, FillStyle, useAppStore } from '@/Store/store';
import { actionType, elementType } from '@/types/type';
// --- Helper Functions for "Crazy Smooth" Details ---

/**
 * Gets the qualitative text label for the roughness slider.
 * @param {number} value - The current roughness value (0-100)
 * @returns {string} - The descriptive label
 */
const getRoughnessLabel = (value: number) => {
  if (value < 10) return "Smooth";
  if (value < 35) return "Slightly Shaky";
  if (value < 65) return "Wobbly";
  if (value < 90) return "Rough";
  return "Chaotic";
};

/**
 * Generates an SVG path string for the "wobble" waveform.
 * @param {number} value - The current roughness value (0-100)
 * @returns {string} - The 'd' attribute for an SVG path
 */


// --- Custom CSS for the "Rough" Aesthetic ---
// This injects the hand-drawn feel directly into the component.
const RoughStyles = () => (
  <style>{`
    // @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@300;400&display=swap');

    .sketch-font {
      font-family: 'Kalam', cursive;
      font-weight: 400;
    }

    /* Base class for all "rough" UI elements */  
    .rough-element {    
      box-shadow: 0 0 19px 3px #fedec9, 2px 2px 0 0px #fedec9;
      transition: all 0.1s ease-in-out;
    }

    /* "Rough" buttons and swatches */
    .rough-button {
      border: 2px solid #1a1a1a;
      // border-radius: 4px 3px 5px 3px / 3px 5px 3px 4px;
      box-shadow: 2px 2px 0 0px #1a1a1a;
      transition: all 0.1s ease-out;
    }
    .rough-button:active {
      box-shadow: 0px 0px 0 0px #1a1a1a;
      transform: translate(2px, 2px);
    }

    /* "Rough" active state glow */
    .active-glow {
      box-shadow: 0 0 10px 3px #007aff, 2px 2px 0 0px #1a1a1a;
      border-color: #007aff;
    }

    /* "Rough" slider track */
    .rough-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      background: #eee;
      border: 2px solid #1a1a1a;
      border-radius: 3px 2px 4px 2px / 2px 4px 2px 3px;
    }

    /* "Rough" slider thumb */
    .rough-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      background: #fff;
      border: 2px solid #1a1a1a;
      border-radius: 5px 3px 4px 3px / 3px 4px 5px 3px;
      cursor: pointer;
      box-shadow: 1px 1px 0 0px #1a1a1a;
    }
    .rough-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      background: #fff;
      border: 2px solid #1a1a1a;
      border-radius: 5px 3px 4px 3px / 3px 4px 5px 3px;
      cursor: pointer;
      box-shadow: 1px 1px 0 0px #1a1a1a;
    }
  `}</style>
);



export default function RoughSketchToolbox() {
  // --- State for all controls ---
  const [target, setTarget] = useState<string | null>(null); 
  const { strokeColor, setActiveToolbarId, toolbar, setCurrentTool, setIsDragging, setIsSelecting, setStrokeColor, fillColor, setFillColor, isFillTransparent, setIsFillTransparent, strokeWidth, setStrokeWidth
    , setRoughness, fillStyle, setFillStyle, fillWeight, setFillWeight, shapeType, setShapeType, roughness,
    boundaryStyle, setBoundaryStyle, isAdvancedOpen, setIsAdvancedOpen, hasShadow, setHasShadow, opacity, setOpacity, rotation, setRotation
  } = useAppStore()

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

  // --- Animation Variants ---
  const panelAnimation = {
    initial: { opacity: 0, height: 0, marginTop: 0 },
    animate: { opacity: 1, height: 'auto', marginTop: '1rem' },
    exit: { opacity: 0, height: 0, marginTop: 0 },
    transition: { duration: 0.3, ease: 'easeInOut' }
  };
  const handleClick = (id: string, action: actionType, elementType: elementType) => {
    setActiveToolbarId(id)

    setCurrentTool({ action, elementType })
    if (action === actionType.Selecting) setIsSelecting(true)
    else { setIsSelecting(false) }
    if (action === actionType.Dragging) setIsDragging(true)
    else { setIsDragging(false) }


  }
  const colorRef = useRef<HTMLInputElement | null>(null);
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value;
    if (target === "stroke") setStrokeColor(value);
    if (target === "fill") setFillColor(value);
  };

  const openPicker = (type : string | null) => {
    setTarget(type);
    if(!colorRef.current) return ;
    colorRef.current.click();
  };
  return (
    <>
      <RoughStyles />
      <div className=" absolute  top-10 left-2 z-10 sketch-font rough-element w-80 max-w-full bg-gray-500 p-4 rounded-4xl shadow-lg space-y-5 select-none">


        <section>
          <h2 className="text-xl font-bold mb-3">ToolBox</h2>

        
          <div className="space-y-2">
            <label className="text-sm font-bold">Stroke Color</label>
            <div className="flex items-center space-x-2">
              <input ref={colorRef} type="color" hidden onChange={handleChange} />
              <motion.button
                className="rough-button w-10 h-10 rounded-full shrink-0"
                style={{ backgroundColor: strokeColor }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Select stroke color"
               
                onClick={() => {
                 
                  openPicker('stroke')
                }}
              />
              <div className="flex flex-wrap gap-1">
                {swatches.map((color) => (
                  <motion.button
                    key={color}
                    className="rough-button w-6 h-6 rounded-md"
                    style={{ backgroundColor: color }}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setStrokeColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* --- Fill Color --- */}
          <div className="space-y-2 mt-4">
            <label className="text-sm font-bold">Fill Color</label>
            <div className="flex items-center space-x-2">
              <motion.button
                className="rough-button w-10 h-10 rounded-full shrink-0 relative overflow-hidden"
                style={{ backgroundColor: isFillTransparent ? '#ffffff' : fillColor }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {

                  openPicker('fill')
                }}
                aria-label="Select fill color"
              >
                {isFillTransparent && (
                  <div className="w-full h-full bg-checker-pattern opacity-50"></div>
                )}
              </motion.button>
              <motion.button
                className={`rough-button w-10 h-10 rounded-md p-1 ${isFillTransparent ? 'active-glow' : ''}`}
                onClick={() => setIsFillTransparent(!isFillTransparent)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Toggle transparent fill"
              >
                <div className="w-full h-full bg-checker-pattern rounded-sm"></div>
              </motion.button>
              <div className="flex flex-wrap gap-1">
                {swatches.map((color) => (
                  <motion.button
                    key={color}
                    className="rough-button w-6 h-6 rounded-md"
                    style={{ backgroundColor: color }}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setFillColor(color);
                      setIsFillTransparent(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* --- Stroke Width --- */}
          <div className="space-y-2 mt-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold">Stroke Width</label>
              <span className="text-xs font-bold px-2 py-0.5 ">
                {strokeWidth}px
              </span>
            </div>
            {/* "Crazy Smooth" Dynamic Visual Line */}
            <div className="w-full h-12 flex items-center justify-center p-2  bg-white">
              <div
                className=""
                style={{
                  width: '80%',
                  height: `${strokeWidth}px`,
                  backgroundColor: strokeColor,
                  borderRadius: `${strokeWidth / 4}px`, // Make it "rougher" as it gets thicker
                }}
              ></div>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="rough-slider w-full"
            />
          </div>

        
          <div className="space-y-2 mt-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold">Roughness</label>
              <span className="text-xs font-bold px-2 py-0.5 ">
                {getRoughnessLabel(roughness)}
              </span>
            </div>
          

            <input
              type="range"
              min="0"
              max="100"
              value={roughness}
              onChange={(e) => setRoughness(Number(e.target.value))}
              className="rough-slider w-full"
            />
          </div>

          {/* --- Fill Style --- */}
          <div className="space-y-2 mt-4">
            <label className="text-sm font-bold">Fill Style</label>
            <div className="grid grid-cols-4 gap-2">
              {fillStyles.map((style) => (
                <motion.button
                  key={style.id}
                  className={`rough-button p-2 text-xs ${fillStyle === style.id ? 'active-glow' : ''}`}
                  onClick={() => setFillStyle(style.id as FillStyle)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {style.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* --- Fill Weight (Contextual) --- */}
          <AnimatePresence>
            {(fillStyle === 'hachure' || fillStyle === 'dots' || fillStyle === 'zigzag') && (
              <motion.div
                layout
                initial="initial"
                animate="animate"
                exit="exit"
                variants={panelAnimation}
                className="space-y-2 overflow-hidden"
              >
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold">Fill Weight</label>
                  <span className="text-xs font-bold px-2 py-0.5 ">
                    {fillWeight}
                  </span>

                </div>
                {/* "Crazy Smooth" Live Pattern Preview */}
                <div className="w-full h-12  bg-white p-2">
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundColor: fillColor,
                      // This is a simple simulation of fill styles
                      backgroundImage: fillStyle === 'hachure'
                        ? `repeating-linear-gradient(45deg, ${strokeColor} 0, ${strokeColor} 1px, transparent 1px, transparent ${fillWeight / 2}px)`
                        : fillStyle === 'dots'
                          ? `radial-gradient(${strokeColor} 15%, transparent 16%)`
                          : `repeating-linear-gradient(45deg, ${strokeColor} 0, ${strokeColor} 1px, transparent 1px, transparent ${fillWeight / 4}px), repeating-linear-gradient(-45deg, ${strokeColor} 0, ${strokeColor} 1px, transparent 1px, transparent ${fillWeight / 4}px)`,
                      backgroundSize: fillStyle === 'dots' ? `${fillWeight / 2}px ${fillWeight / 2}px` : 'auto',
                      opacity: isFillTransparent ? 0 : 1
                    }}
                  ></div>
                </div>
                <input
                  type="range"
                  min="2"
                  max="40"
                  value={fillWeight}
                  onChange={(e) => setFillWeight(Number(e.target.value))}
                  className="rough-slider w-full"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <hr className="" />

        {/* === 2. SHAPE PROPERTIES === */}
        <section>
          <h2 className="text-xl font-bold mb-3"> Shapes</h2>

          {/* --- Shape Type --- */}
          <div className="space-y-2">
            <label className="text-sm  mb-3 font-bold">Tools</label>
            <div className="grid grid-cols-4 gap-2">
              {TOOLBAR_ITEM.map((item) => (
                <motion.button
                  key={item.id}
                  className={`rough-button p-2 text-xl ${toolbar.activeToolId === item.id ? 'active-glow' : ''}`}
                  onClick={() => handleClick(item.id, item.actionType, item.elementType)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {React.createElement(item.icon)}
                </motion.button>
              ))}
            </div>
          </div>

          {/* --- Boundary Style --- */}
          <div className="space-y-2 mt-4">
            <label className="text-sm font-bold">Boundary Style</label>
            <div className="grid grid-cols-3 gap-2">
              {boundaryStyles.map((style) => (
                <motion.button
                  key={style.id}
                  className={`rough-button p-2 text-xs ${boundaryStyle === style.id ? 'active-glow' : ''}`}
                  onClick={() => setBoundaryStyle(style.id as BoundaryStyle)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <div className="h-5 flex items-center justify-center">
                    <div
                      className="w-full"
                      style={{
                        borderTop: `3px ${style.id} ${strokeColor}`,
                      }}
                    ></div>
                  </div>
                  {style.label}
                </motion.button>
              ))}
            </div>
          </div>
    
          <div className="mt-4">
            <button
              className="sketch-font rough-button w-full text-left p-2 bg-gray-200 flex justify-between items-center"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            >
              <span>Advanced Properties</span>
              <motion.span animate={{ rotate: isAdvancedOpen ? 180 : 0 }}>
                ▼
              </motion.span>
            </button>

            <AnimatePresence>
              {isAdvancedOpen && (
                <motion.div
                  layout
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={panelAnimation}
                  className="space-y-4 p-3 rough-element bg-gray-100 overflow-hidden"
                >
                  {/* --- Shadow / Blur --- */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="shadow"
                        checked={hasShadow}
                        onChange={(e) => setHasShadow(e.target.checked)}
                      />
                      <label htmlFor="shadow" className="text-sm font-bold">
                        Shadow / Blur
                      </label>
                    </div>
                  </div>

                  {/* --- Opacity --- */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Opacity</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="rough-slider w-full"
                      />
                      {/* "Crazy Smooth" Opacity Preview */}
                      <div
                        className="w-8 h-8 rough-element shrink-0 bg-checker-pattern"
                      >
                        <div
                          className="w-full h-full"
                          style={{ backgroundColor: fillColor, opacity: opacity }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* --- Rotation --- */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Rotation</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={rotation}
                        onChange={(e) => setRotation(Number(e.target.value))}
                        className="rough-slider w-full"
                      />

                      <div className="w-8 h-8 rough-element shrink-0 flex items-center justify-center">
                        <div
                          className="w-4/5 h-4/5 rough-element"
                          style={{
                            backgroundColor: fillColor,
                            border: `2px ${boundaryStyle} ${strokeColor}`,
                            transform: `rotate(${rotation}deg)`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* This is a helper for the checker pattern background */}
        <div
          className="bg-checker-pattern"
          style={{
            display: 'none',
            ['--tw-bg-opacity' ]: '1',
            backgroundColor: 'rgba(209, 213, 219, var(--tw-bg-opacity))',
            backgroundImage: 'linear-gradient(45deg, rgba(255, 255, 255, var(--tw-bg-opacity)) 25%, transparent 25%), linear-gradient(-45deg, rgba(255, 255, 255, var(--tw-bg-opacity)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, var(--tw-bg-opacity)) 75%), linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, var(--tw-bg-opacity)) 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
          } as React.CSSProperties}
        ></div>
      </div>
    </>
  );
}
