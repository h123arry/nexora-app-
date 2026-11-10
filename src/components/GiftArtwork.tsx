import React from 'react';

type GiftArtworkProps = {
  src: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'sync' | 'auto';
  draggable?: boolean;
  dataAnimation?: string;
};

export default function GiftArtwork({
  src, alt, className = '', loading = 'lazy', decoding = 'async',
  draggable = false, dataAnimation,
}: GiftArtworkProps) {
  if (src.includes('#')) {
    return (
      <svg
        className={className}
        viewBox="0 0 512 512"
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        data-animation={dataAnimation}
      >
        <use href={src} />
      </svg>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      draggable={draggable}
      data-animation={dataAnimation}
      className={className}
    />
  );
}
