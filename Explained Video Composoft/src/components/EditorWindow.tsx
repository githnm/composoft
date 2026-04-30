import React from 'react';
import { FONTS } from '../styles';

type Props = {
  filename: string;
  width?: number;
  children?: React.ReactNode;
};

export const EditorWindow: React.FC<Props> = ({
  filename,
  width = 1280,
  children,
}) => (
  <div
    style={{
      width,
      background: '#fff',
      borderRadius: 14,
      border: '1px solid rgba(0, 0, 0, 0.08)',
      boxShadow:
        '0 1px 0 rgba(0, 0, 0, 0.02), 0 12px 32px rgba(0, 0, 0, 0.05)',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        background: '#f3f3f3',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        paddingLeft: 18,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 8,
          paddingTop: 16,
          paddingBottom: 16,
          paddingRight: 24,
        }}
      >
        <Dot color="#ff5f57" />
        <Dot color="#febc2e" />
        <Dot color="#28c840" />
      </div>
      <div
        style={{
          padding: '12px 22px 14px 22px',
          background: '#fff',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          fontSize: 16,
          fontFamily: FONTS.mono,
          color: '#333',
          marginBottom: -1,
          borderLeft: '1px solid rgba(0, 0, 0, 0.06)',
          borderRight: '1px solid rgba(0, 0, 0, 0.06)',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        {filename}
      </div>
    </div>
    <div style={{ padding: 36 }}>{children}</div>
  </div>
);

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <div
    style={{
      width: 13,
      height: 13,
      borderRadius: '50%',
      background: color,
    }}
  />
);
