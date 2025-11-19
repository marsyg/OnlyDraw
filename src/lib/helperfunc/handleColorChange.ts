import { useAppStore } from '@/Store/store';

const useHandleChange = () => {
  const { setColor } = useAppStore();
 
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value);
  };

  return { handleColorChange };
};

export default useHandleChange;