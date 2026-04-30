import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../styles';

export const Scene6Final: React.FC = () => {
  const frame = useCurrentFrame();
  const easeOut = Easing.out(Easing.cubic);

  const opacity = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const ty = interpolate(frame, [0, 60], [12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.offWhite,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${ty}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontFamily: FONTS.inter,
            fontWeight: 600,
            fontSize: 120,
            color: COLORS.black,
            letterSpacing: '-0.045em',
            lineHeight: 1,
          }}
        >
          composoft
        </div>
        <div
          style={{
            marginTop: 40,
            fontFamily: FONTS.mono,
            fontSize: 28,
            color: COLORS.black,
          }}
        >
          github.com/githnm/composoft
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: FONTS.mono,
            fontSize: 22,
            color: '#888',
          }}
        >
          npx @composoft/create@alpha
        </div>
      </div>
    </AbsoluteFill>
  );
};
