'use client'
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Loading from '@/component/loading';

const Canvas = dynamic(() => import('@/app/canvas/page'), {
    ssr: false,
});

export default function Home() {
    const [isLoading, setIsLoading] = useState(true);
    const [canvasLoaded, setCanvasLoaded] = useState(false);

    useEffect(() => {

        const preloadTimer = setTimeout(() => {
            setCanvasLoaded(true);
        }, 100);


        const loaderTimer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);

        return () => {
            clearTimeout(preloadTimer);
            clearTimeout(loaderTimer);
        };
    }, []);

    return (
        <div className="w-full h-screen">
            {isLoading && (
                <div className="absolute inset-0 z-50">
                    <Loading />
                </div>
            )}
            {canvasLoaded && (
                <div className={`w-full h-screen ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
                    <Canvas />
                </div>
            )}
        </div>
    );
}