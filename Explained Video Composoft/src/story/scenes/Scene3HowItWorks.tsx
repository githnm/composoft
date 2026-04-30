import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { DotGrid } from '../components/DotGrid';
import { COLORS, FONTS, SPRING_SNAPPY } from '../../styles';

type Tile = {
  layer: string;
  code: string;
};

const TILES: Tile[] = [
  { layer: 'Data', code: 'defineAdapter({\n  id: "deals.list",\n})' },
  { layer: 'Logic', code: 'validate(deal)\n  => requireFields(...)' },
  { layer: 'Workflow', code: 'defineWorkflow({\n  id: "deal.advance",\n})' },
  { layer: 'UI', code: 'defineBlock({\n  id: "pipeline",\n})' },
];

const LABEL_FRAME = 90;
const HOLD_END = 130;
const COMPRESS_END = 155;
const PIPELINE_FRAME = 150;

export const Scene3HowItWorks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const easeOut = Easing.out(Easing.cubic);

  const labelOpacity = interpolate(
    frame,
    [LABEL_FRAME, LABEL_FRAME + 18, HOLD_END, COMPRESS_END],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut }
  );
  const labelY = interpolate(
    frame,
    [LABEL_FRAME, LABEL_FRAME + 18],
    [6, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut }
  );

  const pipelineSpring = spring({
    frame: frame - PIPELINE_FRAME,
    fps,
    config: SPRING_SNAPPY,
  });
  const pipelineWidth = interpolate(pipelineSpring, [0, 1], [0, 280]);
  const pipelineOpacity = interpolate(
    frame,
    [PIPELINE_FRAME, PIPELINE_FRAME + 14],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const arrowStart = PIPELINE_FRAME + 12;
  const arrowProgress = spring({
    frame: frame - arrowStart,
    fps,
    config: SPRING_SNAPPY,
  });
  const arrowHeight = interpolate(arrowProgress, [0, 1], [0, 60]);
  const arrowOpacity = interpolate(frame, [arrowStart, arrowStart + 12], [0, 1], {
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
        paddingTop: 100,
      }}
    >
      <DotGrid />

      <RegistryPill />

      <div
        style={{
          marginTop: 70,
          display: 'flex',
          gap: 22,
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        {TILES.map((tile, i) => (
          <ConfigTile
            key={tile.layer}
            tile={tile}
            startFrame={15 + i * 14}
            compressStart={130}
            compressEnd={150}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: 30,
          opacity: labelOpacity,
          transform: `translateY(${labelY}px)`,
          fontFamily: FONTS.inter,
          fontSize: 22,
          fontWeight: 400,
          color: COLORS.dimText,
          letterSpacing: '-0.005em',
        }}
      >
        Configure each layer with composoft.
      </div>

      <div
        style={{
          marginTop: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            opacity: pipelineOpacity,
            width: pipelineWidth,
            height: 3,
            background: COLORS.blue,
            borderRadius: 2,
            boxShadow: `0 0 12px ${COLORS.blue}`,
          }}
        />
        <div
          style={{
            opacity: arrowOpacity,
            width: 2,
            height: arrowHeight,
            background: COLORS.blue,
            marginTop: 0,
          }}
        />
        <div
          style={{
            opacity: arrowOpacity,
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: `10px solid ${COLORS.blue}`,
            transform: arrowProgress > 0.7 ? 'translateY(0)' : 'translateY(-4px)',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const RegistryPill: React.FC = () => (
  <div
    style={{
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
);

const ConfigTile: React.FC<{
  tile: Tile;
  startFrame: number;
  compressStart: number;
  compressEnd: number;
}> = ({ tile, startFrame, compressStart, compressEnd }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const easeOut = Easing.out(Easing.cubic);

  const enterSpring = spring({
    frame: frame - startFrame,
    fps,
    config: SPRING_SNAPPY,
  });
  const enterY = interpolate(enterSpring, [0, 1], [14, 0]);
  const enterOpacity = interpolate(
    frame,
    [startFrame, startFrame + 16],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const compressOpacity = interpolate(
    frame,
    [compressStart, compressEnd],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut }
  );
  const compressScaleX = interpolate(
    frame,
    [compressStart, compressEnd],
    [1, 0.4],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut }
  );
  const compressY = interpolate(
    frame,
    [compressStart, compressEnd],
    [0, 12],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut }
  );

  return (
    <div
      style={{
        opacity: enterOpacity * compressOpacity,
        transform: `translateY(${enterY + compressY}px) scaleX(${compressScaleX})`,
        transformOrigin: 'center center',
        width: 240,
        background: COLORS.surfaceDarkRaised,
        border: `1px solid ${COLORS.darkBorderStrong}`,
        borderRadius: 12,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: FONTS.inter,
          fontSize: 11,
          fontWeight: 500,
          color: COLORS.dimText,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: COLORS.blue,
          }}
        />
        {tile.layer}
      </div>
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          color: COLORS.offWhite,
          lineHeight: 1.55,
          whiteSpace: 'pre',
        }}
      >
        {tile.code}
      </div>
    </div>
  );
};
