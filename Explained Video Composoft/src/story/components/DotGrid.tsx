import React from 'react';

type Props = {
  opacity?: number;
  spacing?: number;
};

export const DotGrid: React.FC<Props> = ({ opacity = 0.04, spacing = 32 }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: `radial-gradient(circle at center, rgba(255, 255, 255, ${opacity}) 1px, transparent 1.4px)`,
      backgroundSize: `${spacing}px ${spacing}px`,
      pointerEvents: 'none',
    }}
  />
);
