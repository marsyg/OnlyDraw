import React from 'react'
import Image from 'next/image'

const CustomLoader = () => {
    return (
        <div className="w-full max-w-md space-y-2">
            {/* Loader Container 
        - h-4: Height of the bar
        - w-full: Takes up full width of parent
        - bg-green-100: Very light green background for the 'empty' part
        - rounded-xl: 'Soft edges' (rounded corners)
        - overflow-hidden: Ensures the inner bar doesn't poke out of the rounded corners
      */}
            <div className="h-4 w-full bg-green-100 rounded-xl overflow-hidden relative shadow-sm">

                {/* Animated Bar
          - h-full: Matches container height
          - bg-green-500: The main 'Greenish' color
          - rounded-xl: Soft edges
          - animate-fill: Custom animation defined in style tag below
        */}
                <div className="h-full bg-green-500 rounded-xl animate-loader"></div>
            </div>

            {/* Optional styling for the animation itself */}
            <style>{`
        @keyframes fill-bar {
          0% { width: 0%; opacity: 1; }
          50% { width: 70%; }
          90% { width: 100%; opacity: 1; }
          100% { width: 100%; opacity: 0; }
        }
        .animate-loader {
          animation: fill-bar 1s ;
        }
      `}</style>
        </div>
    );
};
function Loading() {
    return (
        <div className='flex items-center justify-center bg-white w-full h-screen'>
            <div className=' flex flex-col  text-gray-500'>
                <Image src="/icon.png" alt="" width={300} height={300} className='rounded-4xl' />
                <div className='font-serif font-extrabold items-center text-black mb-6 text-center text-3xl'>
                    <div>
                        Only Draw
                    </div>
                </div>
                <div>Loading ..</div>
                <CustomLoader></CustomLoader>
            </div>
        </div>
    )
}

export default Loading