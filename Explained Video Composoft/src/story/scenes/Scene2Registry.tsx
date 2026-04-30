import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { LayerCard } from '../components/LayerCard';
import { DotGrid } from '../components/DotGrid';
import { COLORS, FONTS, SPRING_SNAPPY } from '../../styles';

const LAYERS = [
  {
    label: 'Data layer',
    items: ['Leads', 'Deals', 'Contacts', 'Activities'],
    startFrame: 15,
  },
  {
    label: 'Logic layer',
    items: ['Validations', 'Calculations', 'Permissions'],
    startFrame: 45,
  },
  {
    label: 'Workflow layer',
    items: ['Send email', 'Update stage', 'Assign rep'],
    startFrame: 75,
  },
  {
    label: 'UI layer',
    items: ['Pipeline', 'Inbox', 'Reports', 'Dashboards'],
    startFrame: 105,
  },
];

const SHRINK_START = 160;
const SHRINK_END = 180;
const PILL_START = 170;

export const Scene2Registry: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const easeOut = Easing.out(Easing.cubic);

  const topLabelOpacity = interpolate(
    frame,
    [0, 15, 155, 170],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut }
  );

  const equalsOpacity = interpolate(
    frame,
    [128, 144, 158, 170],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut }
  );
  const equalsY = interpolate(frame, [128, 144], [6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  const pillSpring = spring({
    frame: frame - PILL_START,
    fps,
    config: SPRING_SNAPPY,
  });
  const pillScale = interpolate(pillSpring, [0, 1], [0.85, 1]);
  const pillOpacity = interpolate(
    frame,
    [PILL_START, PILL_START + 16],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bgDark,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 100,
      }}
    >
      <DotGrid />

      <div style={{ position: 'relative', height: 60 }}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            opacity: topLabelOpacity,
            fontFamily: FONTS.inter,
            fontSize: 22,
            fontWeight: 400,
            color: COLORS.dimText,
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          An AI-native CRM company ships:
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: `translateX(-50%) scale(${pillScale})`,
            opacity: pillOpacity,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: COLORS.surfaceDarkRaised,
            border: `1px solid ${COLORS.darkBorderStrong}`,
            padding: '10px 18px',
            borderRadius: 999,
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.04) inset, 0 6px 18px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: COLORS.blue,
              boxShadow: `0 0 8px ${COLORS.blue}`,
            }}
          />
          <div
            style={{
              fontFamily: FONTS.inter,
              fontSize: 17,
              fontWeight: 500,
              color: COLORS.white,
              letterSpacing: '-0.005em',
            }}
          >
            Registry
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 80,
          display: 'flex',
          gap: 28,
          justifyContent: 'center',
        }}
      >
        {LAYERS.map((layer) => (
          <LayerCard
            key={layer.label}
            label={layer.label}
            items={layer.items}
            startFrame={layer.startFrame}
            shrinkStart={SHRINK_START}
            shrinkEnd={SHRINK_END}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: 40,
          opacity: equalsOpacity,
          transform: `translateY(${equalsY}px)`,
          fontFamily: FONTS.inter,
          fontSize: 26,
          fontWeight: 500,
          color: COLORS.white,
          letterSpacing: '-0.01em',
        }}
      >
        = the registry
      </div>
    </AbsoluteFill>
  );
};
