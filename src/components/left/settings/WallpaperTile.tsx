import type { FC } from '../../../lib/teact/teact';
import React, {
  memo, useCallback, useEffect, useRef,
  useState,
} from '../../../lib/teact/teact';

import type { ApiWallpaper } from '../../../api/types';
import type { ThemeKey } from '../../../types';
import { UPLOADING_WALLPAPER_SLUG } from '../../../types';

import { CUSTOM_BG_CACHE_NAME } from '../../../config';
import buildClassName from '../../../util/buildClassName';
import * as cacheApi from '../../../util/cacheApi';
import { fetchBlob } from '../../../util/files';

import useCanvasBlur from '../../../hooks/useCanvasBlur';
import useMedia from '../../../hooks/useMedia';
import useMediaWithLoadProgress from '../../../hooks/useMediaWithLoadProgress';
import usePreviousDeprecated from '../../../hooks/usePreviousDeprecated';
import useShowTransitionDeprecated from '../../../hooks/useShowTransitionDeprecated';

import ProgressSpinner from '../../ui/ProgressSpinner';

import './WallpaperTile.scss';
import AnimatedWallpaper from '../../ui/AnimatedWallpaper';
import { isWebGLSupported } from '../../../util/renderAnimatedWallpaper';
import { ungzip } from 'pako';

type OwnProps = {
  wallpaper: ApiWallpaper;
  theme: ThemeKey;
  isSelected: boolean;
  onClick: (id: string, slug: string, isAnimated?: boolean, isDark?: boolean, isPattern?:boolean, colors?: number[]) => void;
};

const WallpaperTile: FC<OwnProps> = ({
  wallpaper,
  theme,
  isSelected,
  onClick,
}) => {
  const { slug, document } = wallpaper;
  const localMediaHash = document ? `wallpaper${document.id}` : undefined;
  const localBlobUrl = document?.previewBlobUrl ?? undefined;
  const previewBlobUrl = useMedia(`${localMediaHash}?size=m`);
  const thumbRef = useCanvasBlur(document?.thumbnail?.dataUri, Boolean(previewBlobUrl), true);
  const { transitionClassNames } = useShowTransitionDeprecated(
    Boolean(previewBlobUrl || localBlobUrl),
    undefined,
    undefined,
    'slow',
  );
  const isLoadingRef = useRef(false);
  const [isLoadAllowed, setIsLoadAllowed] = useState(false);
  const {
    mediaData: fullMedia, loadProgress,
  } = useMediaWithLoadProgress(localMediaHash, !isLoadAllowed);
  const wasLoadDisabled = usePreviousDeprecated(isLoadAllowed) === false;
  const { shouldRender: shouldRenderSpinner, transitionClassNames: spinnerClassNames } = useShowTransitionDeprecated(
    (isLoadAllowed && !fullMedia) || slug === UPLOADING_WALLPAPER_SLUG,
    undefined,
    wasLoadDisabled,
    'slow',
  );
  // To prevent triggering of the effect for useCallback
  const cacheKeyRef = useRef<string>();
  cacheKeyRef.current = theme;

  const isAnimatedWallpaper = isWebGLSupported() && (wallpaper.pattern || wallpaper.noFile);

  const handleSelect = useCallback(() => {
    (async () => {
     
      if (!fullMedia) {
        if (!wallpaper.document) {
          onClick(wallpaper.id, slug, true, wallpaper.dark,wallpaper.pattern,
            [wallpaper.backgroundColor,
            wallpaper.secondBackgroundColor,
            wallpaper.thirdBackgroundColor,
            wallpaper.fourthBackgroundColor].filter(Boolean));
        }
        return;
      }
      let blob = await fetchBlob(fullMedia)
      if (!blob) {
        return
      }
      if (blob && blob.type === 'application/x-tgwallpattern') {
        blob = await uncompressTGV(blob);
      }      

      await cacheApi.save(CUSTOM_BG_CACHE_NAME, cacheKeyRef.current!, blob);

      if (isAnimatedWallpaper) {
        onClick(wallpaper.id, slug, true, wallpaper.dark, wallpaper.pattern,
          [wallpaper.backgroundColor,
          wallpaper.secondBackgroundColor,
          wallpaper.thirdBackgroundColor,        
          wallpaper.fourthBackgroundColor].filter(Boolean));
      } else {
        onClick(wallpaper.id, slug,);
      }

    })();
  }, [fullMedia, onClick, wallpaper.id, loadProgress]);


  useEffect(() => {
    // If we've clicked on a wallpaper, select it when full media is loaded
    if (fullMedia && isLoadingRef.current) {
      handleSelect();
      isLoadingRef.current = false;
    }
  }, [fullMedia, handleSelect]);


  const handleClick = useCallback(() => {
    if (!wallpaper.document) {
      handleSelect();
      return;
    }

    if (fullMedia) {
      handleSelect();
    } else {
      isLoadingRef.current = true;
      setIsLoadAllowed((isAllowed) => !isAllowed);
    }
  }, [fullMedia, handleSelect]);

  return (
    <div className={buildClassName(
      'WallpaperTile',
      isSelected && 'selected',
      wallpaper.slug)}
      onClick={handleClick}
      style={
        `--bg-size:cover;`
      }
      >

      <div className="media-inner">
        {isAnimatedWallpaper ?
          (
            <AnimatedWallpaper
              isDark={wallpaper.dark}
              isPattern={wallpaper.pattern}
              colors={[
                wallpaper.backgroundColor,
                wallpaper.secondBackgroundColor,
                wallpaper.thirdBackgroundColor,
                wallpaper.fourthBackgroundColor
              ].filter(Boolean)}
              blobUrl={`url(${previewBlobUrl || localBlobUrl})`}
            />
          ) :
          (
            <>
              <canvas
                ref={thumbRef}
                className="thumbnail"
              />

              <img
                src={(previewBlobUrl || localBlobUrl)!}
                className={buildClassName('full-media', transitionClassNames)}
                alt=""
                draggable={false}
              />
            </>
          )
        }

        {shouldRenderSpinner && (
          <div className={buildClassName('spinner-container', spinnerClassNames)}>
            <ProgressSpinner progress={loadProgress} onClick={handleClick} />
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(WallpaperTile);

const uncompressTGV = async (blob: Blob) => {
  const bytes = await blobToUint8Array(blob)
  const buffer = bytes.slice().buffer;
  
  return new Blob([ungzip(buffer)], { type: 'image/svg+xml' });
};

function blobToUint8Array(blob: Blob): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    if (!(blob instanceof Blob)) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const arrayBuffer = event.target!.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        resolve(uint8Array);
      } catch (error) {

        resolve(null);
      }
    };

    reader.onerror = function () {
      resolve(null);
    };

    reader.readAsArrayBuffer(blob);
  });
}