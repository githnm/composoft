import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../styles';

export const Scene1Intro: React.FC = () => {
  const frame = useCurrentFrame();

  const easeOut = Easing.out(Easing.cubic);

  const line1Opacity = interpolate(
    frame,
    [30, 60, 150, 180],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easeOut,
    }
  );
  const line1Y = interpolate(frame, [30, 60], [10, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  const line2Opacity = interpolate(
    frame,
    [90, 120, 150, 180],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easeOut,
    }
  );
  const line2Y = interpolate(frame, [90, 120], [10, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  return (
    <AbsoluteFill
      style={{
        background: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          opacity: line1Opacity,
          transform: `translateY(${line1Y}px)`,
          color: COLORS.offWhite,
          fontFamily: FONTS.inter,
          fontSize: 76,
          fontWeight: 500,
          letterSpacing: '-0.03em',
        }}
      >
        Per-customer software.
      </div>
      <div
        style={{
          opacity: line2Opacity,
          transform: `translateY(${line2Y}px)`,
          color: '#a0a0a0',
          fontFamily: FONTS.inter,
          fontSize: 52,
          fontWeight: 400,
          letterSpacing: '-0.02em',
        }}
      >
        Generated from a brief.
      </div>
    </AbsoluteFill>
  );
};
