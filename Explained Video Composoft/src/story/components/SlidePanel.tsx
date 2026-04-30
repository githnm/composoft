import React from 'react';
import {
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type Props = {
  enter?: 'right' | 'fade' | 'none';
  exit?: 'left' | 'fade' | 'none';
  enterFrames?: number;
  exitFrames?: number;
  totalFrames?: number;
  slideDistance?: number;
  children: React.ReactNode;
};

export const SlidePanel: React.FC<Props> = ({
  enter = 'right',
  exit = 'left',
  enterFrames = 25,
  exitFrames = 25,
  totalFrames,
  slideDistance = 360,
  children,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const total = totalFrames ?? durationInFrames;

  const easeOut = Easing.out(Easing.cubic);
  const easeIn = Easing.in(Easing.cubic);

  let translateX = 0;
  let opacity = 1;

  if (frame <= enterFrames) {
    if (enter === 'right') {
      translateX = interpolate(frame, [0, enterFrames], [slideDistance, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: easeOut,
      });
    }
    if (enter !== 'none') {
      opacity = interpolate(frame, [0, enterFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }
  }

  const exitStart = total - exitFrames;
  if (frame >= exitStart) {
    if (exit === 'left') {
      translateX = interpolate(
        frame,
        [exitStart, total],
        [0, -slideDistance],
        {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: easeIn,
        }
      );
    }
    if (exit !== 'none') {
      opacity = interpolate(frame, [exitStart, total], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `translateX(${translateX}px)`,
        opacity,
      }}
    >
      {children}
    </div>
  );
};
