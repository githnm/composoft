import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { BrowserWindow } from '../components/BrowserWindow';
import { DotGrid } from '../components/DotGrid';
import { NorthwindKanban } from '../dashboards/NorthwindKanban';
import { FitStudioCalendar } from '../dashboards/FitStudioCalendar';
import { HeliosNetwork } from '../dashboards/HeliosNetwork';
import { COLORS, FONTS } from '../../styles';

const DESIGN_W = 920;
const DESIGN_H = 620;
const MINI_SCALE = 0.55;
const MINI_W = DESIGN_W * MINI_SCALE;
const MINI_H = DESIGN_H * MINI_SCALE;

const CARDS = [
  { url: 'northwind.crm.app', dash: <NorthwindKanban /> },
  { url: 'fitstudio.bookings.app', dash: <FitStudioCalendar /> },
  { url: 'helios.legal.app', dash: <HeliosNetwork /> },
];

export const Scene7Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const easeOut = Easing.out(Easing.cubic);

  const oneRegistryOpacity = interpolate(frame, [70, 95], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const oneRegistryY = interpolate(frame, [70, 95], [6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  const threeOpacity = interpolate(frame, [110, 135], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const threeY = interpolate(frame, [110, 135], [6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  const composedOpacity = interpolate(frame, [145, 170], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bgDark,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 36,
      }}
    >
      <DotGrid />

      <div
        style={{
          opacity: oneRegistryOpacity,
          transform: `translateY(${oneRegistryY}px)`,
          fontFamily: FONTS.inter,
          fontSize: 40,
          fontWeight: 500,
          color: COLORS.white,
          letterSpacing: '-0.018em',
        }}
      >
        One registry.
      </div>

      <div
        style={{
          display: 'flex',
          gap: 38,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {CARDS.map((card, i) => (
          <MiniCard
            key={card.url}
            url={card.url}
            startFrame={i * 12}
          >
            {card.dash}
          </MiniCard>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            opacity: threeOpacity,
            transform: `translateY(${threeY}px)`,
            fontFamily: FONTS.inter,
            fontSize: 40,
            fontWeight: 500,
            color: COLORS.white,
            letterSpacing: '-0.018em',
          }}
        >
          Three customers, three apps.
        </div>
        <div
          style={{
            opacity: composedOpacity,
            fontFamily: FONTS.inter,
            fontSize: 22,
            fontWeight: 400,
            color: COLORS.dimText,
          }}
        >
          Composed in 30 seconds each.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const MiniCard: React.FC<{
  url: string;
  startFrame: number;
  children: React.ReactNode;
}> = ({ url, startFrame, children }) => {
  const frame = useCurrentFrame();
  const easeOut = Easing.out(Easing.cubic);

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  const scale = interpolate(
    frame,
    [startFrame, startFrame + 30],
    [0.96, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easeOut,
    }
  );

  return (
    <div
      style={{
        width: MINI_W,
        height: MINI_H,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${MINI_SCALE})`,
          transformOrigin: 'top left',
        }}
      >
        <BrowserWindow url={url} width={DESIGN_W} height={DESIGN_H}>
          {children}
        </BrowserWindow>
      </div>
    </div>
  );
};
