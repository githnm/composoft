import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';

export type Token = { text: string; color: string };

type Props = {
  tokens: Token[];
  startFrame?: number;
  charsPerFrame?: number;
  showCursor?: boolean;
  cursorColor?: string;
  style?: React.CSSProperties;
};

export const SyntaxTypewriter: React.FC<Props> = ({
  tokens,
  startFrame = 0,
  charsPerFrame = 1,
  showCursor = true,
  cursorColor = '#000',
  style,
}) => {
  const frame = useCurrentFrame();
  const totalLen = useMemo(
    () => tokens.reduce((acc, t) => acc + t.text.length, 0),
    [tokens]
  );
  const elapsed = Math.max(0, frame - startFrame);
  const reveal = Math.min(totalLen, Math.floor(elapsed * charsPerFrame));
  const done = reveal >= totalLen;

  let cursor = 0;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (cursor >= reveal) break;
    const t = tokens[i];
    const remaining = reveal - cursor;
    const slice = t.text.length <= remaining ? t.text : t.text.slice(0, remaining);
    out.push(
      <span key={i} style={{ color: t.color }}>
        {slice}
      </span>
    );
    cursor += t.text.length;
  }

  const cursorVisible = showCursor && frame >= startFrame && !done;

  return (
    <span style={{ whiteSpace: 'pre', ...style }}>
      {out}
      {cursorVisible ? (
        <span
          style={{
            display: 'inline-block',
            width: '0.55ch',
            height: '1.05em',
            backgroundColor: cursorColor,
            verticalAlign: 'text-bottom',
            opacity: 0.55,
            marginLeft: 1,
          }}
        />
      ) : null}
    </span>
  );
};
