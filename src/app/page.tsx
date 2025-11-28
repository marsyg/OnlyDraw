'use client'
import dynamic from 'next/dynamic';
import Loading from '@/component/loading';
const Canvas = dynamic(() => import('@/app/canvas/page'), {
    ssr: false,
    loading: () => <Loading />,
});
export default function Home() {
    return (
        <div>
            <Canvas />
        </div>
    );
}
