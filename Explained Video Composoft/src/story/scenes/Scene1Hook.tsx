import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../../styles';

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const easeOut = Easing.out(Easing.cubic);

  const line1Opacity = interpolate(
    frame,
    [0, 20, 65, 85],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easeOut,
    }
  );
  const line1Y = interpolate(frame, [0, 20], [8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  const line2Opacity = interpolate(
    frame,
    [75, 95, 130, 150],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easeOut,
    }
  );
  const line2Y = interpolate(frame, [75, 95], [8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bgDark,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          opacity: line1Opacity,
          transform: `translateY(${line1Y}px)`,
          color: COLORS.offWhite,
          fontFamily: FONTS.inter,
          fontSize: 70,
          fontWeight: 500,
          letterSpacing: '-0.03em',
          textAlign: 'center',
        }}
      >
        Every customer wants different software.
      </div>
      <div
        style={{
          position: 'absolute',
          opacity: line2Opacity,
          transform: `translateY(${line2Y}px)`,
          color: COLORS.white,
          fontFamily: FONTS.inter,
          fontSize: 76,
          fontWeight: 500,
          letterSpacing: '-0.03em',
          textAlign: 'center',
        }}
      >
        What if every customer got it?
      </div>
    </AbsoluteFill>
  );
};
