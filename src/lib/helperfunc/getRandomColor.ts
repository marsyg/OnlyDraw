function getRandomColor() {
 
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export default getRandomColor