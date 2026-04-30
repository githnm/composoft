import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../styles';

const ITEMS = [
  'Real auth, real persistence',
  'Cross-block coordination',
  'Open source, MIT licensed',
];

export const Scene5Bullets: React.FC = () => {
  const frame = useCurrentFrame();
  const easeOut = Easing.out(Easing.cubic);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.offWhite,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 32,
      }}
    >
      {ITEMS.map((item, i) => {
        const startAt = i * 30;
        const opacity = interpolate(
          frame,
          [startAt, startAt + 25],
          [0, 1],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: easeOut,
          }
        );
        const ty = interpolate(frame, [startAt, startAt + 25], [10, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: easeOut,
        });
        return (
          <div
            key={i}
            style={{
              opacity,
              transform: `translateY(${ty}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              fontFamily: FONTS.inter,
              fontSize: 38,
              fontWeight: 400,
              color: COLORS.black,
              letterSpacing: '-0.015em',
              minWidth: 720,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: COLORS.black,
                flexShrink: 0,
              }}
            />
            {item}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
