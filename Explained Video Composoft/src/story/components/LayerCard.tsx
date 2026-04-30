import React from 'react';
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { COLORS, FONTS, SPRING_SNAPPY } from '../../styles';

type Props = {
  label: string;
  items: string[];
  startFrame: number;
  shrinkStart?: number;
  shrinkEnd?: number;
};

export const LayerCard: React.FC<Props> = ({
  label,
  items,
  startFrame,
  shrinkStart,
  shrinkEnd,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame: frame - startFrame,
    fps,
    config: SPRING_SNAPPY,
  });

  const opacityIn = interpolate(frame, [startFrame, startFrame + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  let translateY = interpolate(enter, [0, 1], [16, 0]);
  let scale = interpolate(enter, [0, 1], [0.96, 1]);
  let opacity = opacityIn;

  if (shrinkStart != null && shrinkEnd != null && frame >= shrinkStart) {
    const t = interpolate(
      frame,
      [shrinkStart, shrinkEnd],
      [1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    scale = scale * interpolate(t, [0, 1], [0.6, 1]);
    opacity = opacity * t;
  }

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        transformOrigin: 'center center',
        width: 320,
        height: 240,
        background: COLORS.surfaceDarkRaised,
        borderRadius: 14,
        border: `1px solid ${COLORS.darkBorderStrong}`,
        padding: '24px 26px',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.inter,
          fontSize: 22,
          fontWeight: 500,
          color: COLORS.white,
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          height: 1,
          background: COLORS.darkBorderStrong,
          marginBottom: 4,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {items.map((item) => (
          <div
            key={item}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: FONTS.inter,
              fontSize: 17,
              color: COLORS.dimText,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: COLORS.mutedDarkText,
                flexShrink: 0,
              }}
            />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};
