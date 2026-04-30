import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../../styles';

export type ComposerLine = {
  text: string;
  success?: boolean;
};

type Props = {
  lines: ComposerLine[];
  startFrame: number;
  endFrame: number;
  lineSpacing?: number;
  width?: number;
};

export const ComposerPanel: React.FC<Props> = ({
  lines,
  startFrame,
  endFrame,
  lineSpacing = 25,
  width = 640,
}) => {
  const frame = useCurrentFrame();
  const easeOut = Easing.out(Easing.cubic);

  const enterOpacity = interpolate(
    frame,
    [startFrame, startFrame + 14],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const enterY = interpolate(frame, [startFrame, startFrame + 14], [10, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  const exitOpacity = interpolate(
    frame,
    [endFrame, endFrame + 16],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const opacity = enterOpacity * exitOpacity;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${enterY}px)`,
        width,
        background: COLORS.surfaceDarkRaised,
        border: `1px solid ${COLORS.darkBorderStrong}`,
        borderRadius: 12,
        padding: '24px 32px',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 48px rgba(0,0,0,0.5)',
        fontFamily: FONTS.mono,
        fontSize: 19,
        lineHeight: 1.7,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          fontSize: 11,
          color: COLORS.mutedDarkText,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: COLORS.green,
            boxShadow: `0 0 6px ${COLORS.green}`,
          }}
        />
        composer
      </div>

      {lines.map((line, i) => {
        const lineStart = startFrame + 14 + i * lineSpacing;
        const lineOpacity = interpolate(
          frame,
          [lineStart, lineStart + 12],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        const lineY = interpolate(
          frame,
          [lineStart, lineStart + 12],
          [4, 0],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: easeOut,
          }
        );
        return (
          <div
            key={i}
            style={{
              opacity: lineOpacity,
              transform: `translateY(${lineY}px)`,
              color: line.success ? COLORS.green : COLORS.dimText,
            }}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
};
