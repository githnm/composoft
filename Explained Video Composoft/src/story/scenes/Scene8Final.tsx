import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { DotGrid } from '../components/DotGrid';
import { COLORS, FONTS } from '../../styles';

export const Scene8Final: React.FC = () => {
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

  const glowOpacity = interpolate(frame, [0, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  const mitOpacity = interpolate(frame, [50, 110], [0, 1], {
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
      <DotGrid />

      <div
        style={{
          opacity,
          transform: `translateY(${ty}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -30,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 760,
            height: 220,
            background:
              'radial-gradient(ellipse at center, rgba(79, 138, 255, 0.32) 0%, rgba(79, 138, 255, 0.08) 40%, transparent 70%)',
            filter: 'blur(28px)',
            opacity: glowOpacity,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            fontFamily: FONTS.inter,
            fontWeight: 600,
            fontSize: 124,
            color: COLORS.white,
            letterSpacing: '-0.045em',
            lineHeight: 1,
          }}
        >
          composoft
        </div>
        <div
          style={{
            marginTop: 30,
            fontFamily: FONTS.inter,
            fontWeight: 400,
            fontSize: 30,
            color: COLORS.dimText,
            letterSpacing: '-0.015em',
          }}
        >
          Per-customer software for AI-native B2B.
        </div>
        <div
          style={{
            marginTop: 38,
            fontFamily: FONTS.mono,
            fontSize: 26,
            color: COLORS.offWhite,
          }}
        >
          github.com/githnm/composoft
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: FONTS.mono,
            fontSize: 21,
            color: COLORS.dimText,
          }}
        >
          npx @composoft/create@alpha
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 70,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: mitOpacity,
          fontFamily: FONTS.inter,
          fontSize: 14,
          color: COLORS.mutedDarkText,
          letterSpacing: '0.04em',
        }}
      >
        MIT licensed. Built by @githnm.
      </div>
    </AbsoluteFill>
  );
};
