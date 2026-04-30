import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Typewriter } from '../components/Typewriter';
import { COLORS, FONTS } from '../styles';

const COMMAND = 'npx @composoft/composer compose --brief brewline.md';

export const Scene3Terminal: React.FC = () => {
  const frame = useCurrentFrame();

  const line1Opacity = interpolate(frame, [105, 120], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const line2Opacity = interpolate(frame, [130, 145], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const line3Opacity = interpolate(frame, [155, 170], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.terminalBg,
        padding: '120px 140px',
        fontFamily: FONTS.mono,
        fontSize: 28,
        lineHeight: 1.6,
        color: COLORS.terminalText,
      }}
    >
      <div>
        <span style={{ color: COLORS.terminalDim }}>$ </span>
        <Typewriter
          text={COMMAND}
          startFrame={10}
          charsPerFrame={0.65}
          cursorColor={COLORS.terminalText}
        />
      </div>

      <div
        style={{
          marginTop: 28,
          opacity: line1Opacity,
          color: '#bdbdbd',
        }}
      >
        <span style={{ color: COLORS.terminalDim }}>- </span>
        Validating composition...
      </div>
      <div style={{ opacity: line2Opacity, color: '#bdbdbd' }}>
        <span style={{ color: COLORS.terminalDim }}>- </span>
        Generating Next.js app...
      </div>
      <div
        style={{
          opacity: line3Opacity,
          color: COLORS.green,
          marginTop: 8,
        }}
      >
        + OK — wrote 18 files to ../app
      </div>
    </AbsoluteFill>
  );
};
