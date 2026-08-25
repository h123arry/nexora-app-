import React, { VideoHTMLAttributes, forwardRef, useState, useEffect, useRef } from 'react';
import { useResolvedUrl } from '../utils/indexedDbStorage';
import NexoraLoader from './NexoraLoader';

interface NexoraVideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  src?: string;
  lazy?: boolean;
}

export const NexoraVideo = forwardRef<HTMLVideoElement, NexoraVideoProps>(
  ({ src, lazy = true, ...props }, ref) => {
    const resolvedUrl = useResolvedUrl(src);
    const finalSrc = src?.startsWith('db-media://') ? resolvedUrl : src;
    const internalRef = useRef<HTMLVideoElement | null>(null);
    const [isVisible, setIsVisible] = useState(!lazy);

    useEffect(() => {
      if (!lazy || isVisible) return;
      const el = internalRef.current;
      if (!el || typeof IntersectionObserver === 'undefined') {
        setIsVisible(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer.disconnect();
            }
          });
        },
        { rootMargin: '300px 0px' }
      );

      observer.observe(el);
      return () => observer.disconnect();
    }, [lazy, isVisible]);

    const setMergedRef = (el: HTMLVideoElement | null) => {
      internalRef.current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLVideoElement | null>).current = el;
      }
    };

    // Render Nexora unified loading state while resolving custom local media DB URLs
    if (src && src.startsWith('db-media://') && !resolvedUrl) {
      return (
        <div className="w-full h-full min-h-[150px] bg-black/40 flex items-center justify-center">
          <NexoraLoader size="md" />
        </div>
      );
    }

    return (
      <video
        ref={setMergedRef}
        src={isVisible ? finalSrc : undefined}
        {...props}
      />
    );
  }
);

NexoraVideo.displayName = 'NexoraVideo';
export default NexoraVideo;
