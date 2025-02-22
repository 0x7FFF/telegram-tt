import type { FC } from '../../lib/teact/teact';
import React, {
    memo, useEffect, useRef, 
} from '../../lib/teact/teact';

import buildClassName from '../../util/buildClassName';

import './AnimatedWallpaper.scss';
import renderAnimatedWallpaper from '../../util/renderAnimatedWallpaper';

interface OwnProps {
    blobUrl?: string;
    colors: number[];
    isDark?: boolean;    
    animate?: number;
    isPattern?:boolean;
    canAnimate?: boolean;  
}

const AnimatedWallpaper: FC<OwnProps> = ({

    blobUrl,
    colors,
    isDark,
    isPattern,
    animate = 1,
    canAnimate = false  
}) => {   
    const _animate = useRef<() => void>(null);


    const _colors = [16777215, 16777215, 16777215, 16777215]
    if(colors.length){
        let j = 0;
        for (let i = 0; i < 4; i++) {
            _colors[i] = colors[j];
            ++j;
            if (j >= colors.length) {
                j = 0
            } 
        }
    }
   

    const gradientCanvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {            
        if (gradientCanvasRef.current ) {           
            _animate.current = renderAnimatedWallpaper(
                gradientCanvasRef.current,
                _colors[0],
                _colors[1],
                _colors[2],
                _colors[3],
                canAnimate
            )
        }
    }, [colors,blobUrl]);
   
    
    useEffect(() => {       
        if(_animate.current && animate > 1){                 
            _animate.current();
        }              
    }, [animate])   
 
    return (
        <div         
            style={
                `
                ${isDark ? 'background-color:black;' :''}                   
                --tw-image: ${blobUrl};                           
                `
            }
            className="AnimatedWallpaper wallpaper-wrap">
            <canvas
                ref={gradientCanvasRef}
                className={buildClassName('wallpaper-canvas', isDark && isPattern && 'wallpaper-mask')}>               
            </canvas>
            {blobUrl && (<div className={buildClassName('wallpaper-pattern')}/> )}
            
        </div>
    );
};

export default memo(AnimatedWallpaper);