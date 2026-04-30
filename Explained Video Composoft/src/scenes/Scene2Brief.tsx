import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { EditorWindow } from '../components/EditorWindow';
import { Typewriter } from '../components/Typewriter';
import { COLORS, FONTS } from '../styles';

const BRIEF = `Inventory dashboard for Brewline Coffee.

KPI cards at top: total SKUs, items below
reorder, open POs, total open spend.
Low-stock alerts grouped by vendor with
one-click PO creation.
Inventory table with adjust-stock action.
Scope to the Oakland Roastery warehouse.`;

export const Scene2Brief: React.FC = () => {
  const frame = useCurrentFrame();
  const easeOut = Easing.out(Easing.cubic);

  const editorOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const editorY = interpolate(frame, [0, 25], [12, 0], {
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
      }}
    >
      <div
        style={{
          opacity: editorOpacity,
          transform: `translateY(${editorY}px)`,
        }}
      >
        <EditorWindow filename="brewline.md" width={1280}>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 24,
              lineHeight: 1.6,
              color: '#222',
              minHeight: 540,
            }}
          >
            <Typewriter
              text={BRIEF}
              startFrame={30}
              charsPerFrame={1.1}
              cursorColor={COLORS.blue}
            />
          </div>
        </EditorWindow>
      </div>
    </AbsoluteFill>
  );
};
