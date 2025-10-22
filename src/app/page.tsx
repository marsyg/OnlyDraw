'use client'
import dynamic from 'next/dynamic';
const Canvas = dynamic(() => import('@/app/canvas/page'), {
    ssr: false,
    loading: () => <p>Loading Canvas...</p>,
});
export default function Home() {
    return (
        <div>
            <Canvas />
        </div>
    );
}
