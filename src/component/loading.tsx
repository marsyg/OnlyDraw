import React from 'react'
import Image from 'next/image'


function Loading() {
    return (
        <div className='flex items-center justify-center bg-white w-full h-screen'>
            <div className=' flex flex-col items-center text-green-500'>
                <Image src="/icon.png" alt="" width={300} height={300} className='rounded-4xl' />
                <div className='font-serif font-extrabold  text-black   text-3xl'>Only Draw</div>
                Loading...
            </div>
        </div>
    )
}

export default Loading