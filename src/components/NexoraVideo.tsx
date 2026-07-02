import React, { VideoHTMLAttributes, forwardRef } from 'react';
import { useResolvedUrl } from '../utils/indexedDbStorage';

interface NexoraVideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  src?: string;
}

export const NexoraVideo = forwardRef<HTMLVideoElement, NexoraVideoProps>(
  ({ src, ...props }, ref) => {
    const resolvedUrl = useResolvedUrl(src);
    const finalSrc = src?.startsWith('db-media://') ? resolvedUrl : src;

    // Render a subtle loading state while resolving custom local media DB URLs
    if (src && src.startsWith('db-media://') && !resolvedUrl) {
      return (
        <div className="w-full h-full min-h-[150px] bg-black/40 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent animate-spin rounded-full" />
        </div>
      );
    }

    return <video ref={ref} src={finalSrc} {...props} />;
  }
);

NexoraVideo.displayName = 'NexoraVideo';
export default NexoraVideo;
