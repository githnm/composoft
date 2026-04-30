import React from 'react';
import {
  Easing,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { Typewriter } from '../../components/Typewriter';
import { COLORS, FONTS } from '../../styles';
import { BrowserWindow } from './BrowserWindow';
import { ComposerPanel, ComposerLine } from './ComposerPanel';

type Props = {
  title: string;
  transcript: string;
  url: string;
  titleStartFrame: number;
  transcriptStartFrame: number;
  charsPerFrame?: number;
  composerStartFrame: number;
  composerEndFrame: number;
  composerLines: ComposerLine[];
  composerLineSpacing?: number;
  dashboardFrame: number;
  browserWidth?: number;
  browserHeight?: number;
  composerWidth?: number;
  dashboard: React.ReactNode;
};

export const CustomerLayout: React.FC<Props> = ({
  title,
  transcript,
  url,
  titleStartFrame,
  transcriptStartFrame,
  charsPerFrame = 2.5,
  composerStartFrame,
  composerEndFrame,
  composerLines,
  composerLineSpacing = 25,
  dashboardFrame,
  browserWidth = 920,
  browserHeight = 620,
  composerWidth = 640,
  dashboard,
}) => {
  const frame = useCurrentFrame();
  const easeOut = Easing.out(Easing.cubic);

  const titleOpacity = interpolate(
    frame,
    [titleStartFrame, titleStartFrame + 14],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const titleY = interpolate(
    frame,
    [titleStartFrame, titleStartFrame + 14],
    [6, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easeOut,
    }
  );

  const browserOpacity = interpolate(
    frame,
    [dashboardFrame, dashboardFrame + 22],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const browserScale = interpolate(
    frame,
    [dashboardFrame, dashboardFrame + 22],
    [0.97, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easeOut,
    }
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        background: COLORS.bgDark,
      }}
    >
      <div
        style={{
          flex: 1,
          padding: '120px 80px 120px 110px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontFamily: FONTS.inter,
            fontSize: 18,
            fontWeight: 500,
            color: COLORS.dimText,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 36,
            fontFamily: FONTS.inter,
            fontSize: 30,
            fontWeight: 400,
            lineHeight: 1.5,
            color: COLORS.offWhite,
            letterSpacing: '-0.01em',
            maxWidth: 620,
          }}
        >
          <Typewriter
            text={transcript}
            startFrame={transcriptStartFrame}
            charsPerFrame={charsPerFrame}
            cursorColor={COLORS.blue}
          />
        </div>
      </div>

      <div
        style={{
          width: browserWidth + 100,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <ComposerPanel
            lines={composerLines}
            startFrame={composerStartFrame}
            endFrame={composerEndFrame}
            lineSpacing={composerLineSpacing}
            width={composerWidth}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${browserScale})`,
            opacity: browserOpacity,
          }}
        >
          <BrowserWindow url={url} width={browserWidth} height={browserHeight}>
            {dashboard}
          </BrowserWindow>
        </div>
      </div>
    </div>
  );
};
