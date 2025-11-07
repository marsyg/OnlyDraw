const boundToElementRect = (
  b: { x: number; y: number; width: number; height: number },
  currentElement?: any
) => {
  // default: element rect == bound
  // keep id and other metadata from currentElement if available
  return {
    ...(currentElement || {}),
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
  };
};
export default boundToElementRect