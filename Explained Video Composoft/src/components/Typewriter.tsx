import React from 'react';
import { useCurrentFrame } from 'remotion';

type Props = {
  text: string;
  startFrame?: number;
  charsPerFrame?: number;
  showCursor?: boolean;
  cursorColor?: string;
  style?: React.CSSProperties;
};

export const Typewriter: React.FC<Props> = ({
  text,
  startFrame = 0,
  charsPerFrame = 1,
  showCursor = true,
  cursorColor,
  style,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const reveal = Math.min(text.length, Math.floor(elapsed * charsPerFrame));
  const visible = text.slice(0, reveal);
  const done = reveal >= text.length;
  const cursorVisible = showCursor && frame >= startFrame && !done;

  return (
    <span style={{ whiteSpace: 'pre-wrap', ...style }}>
      {visible}
      {cursorVisible ? <Cursor color={cursorColor} /> : null}
    </span>
  );
};

const Cursor: React.FC<{ color?: string }> = ({ color }) => (
  <span
    style={{
      display: 'inline-block',
      width: '0.55ch',
      height: '1.05em',
      backgroundColor: color ?? 'currentColor',
      marginLeft: 1,
      verticalAlign: 'text-bottom',
      opacity: 0.55,
    }}
  />
);
