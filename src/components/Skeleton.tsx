import React from 'react';

export const Skeleton = ({ className }: { className?: string }) => {
  return <div aria-hidden="true" className={`nx-skeleton rounded-lg ${className || ''}`} />;
};
