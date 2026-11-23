import React, { useEffect, useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { useResolvedUrl } from '../utils/indexedDbStorage';

/**
 * Resolves NEXORA media gateway and legacy device-local URLs before rendering.
 * Retries transient gateway/network failures twice before reporting the error.
 */
export default function NexoraResolvedImage({ src, onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const resolvedSrc = useResolvedUrl(typeof src === 'string' ? src : undefined);
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    setRetryAttempt(0);
  }, [src, resolvedSrc]);

  const handleError: React.ReactEventHandler<HTMLImageElement> = event => {
    if (retryAttempt < 2) {
      setRetryAttempt(attempt => attempt + 1);
      return;
    }
    onError?.(event);
  };

  return (
    <img
      {...props}
      key={`${resolvedSrc}-${retryAttempt}`}
      src={resolvedSrc || undefined}
      onError={handleError}
    />
  );
}
