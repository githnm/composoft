import React from 'react';
import { COLORS, FONTS } from '../../styles';

type Props = {
  url: string;
  width?: number;
  height?: number;
  children?: React.ReactNode;
};

export const BrowserWindow: React.FC<Props> = ({
  url,
  width = 920,
  height = 620,
  children,
}) => (
  <div
    style={{
      width,
      height,
      background: '#fff',
      borderRadius: 14,
      border: `1px solid ${COLORS.borderGray}`,
      boxShadow:
        '0 0 0 1px rgba(255, 255, 255, 0.04), 0 0 60px rgba(255, 255, 255, 0.08), 0 18px 50px rgba(0, 0, 0, 0.55)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 16px',
        background: '#f8f9fa',
        borderBottom: `1px solid ${COLORS.borderGray}`,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <Dot color="#ff5f57" />
        <Dot color="#febc2e" />
        <Dot color="#28c840" />
      </div>
      <div
        style={{
          flex: 1,
          height: 28,
          background: '#fff',
          borderRadius: 7,
          border: `1px solid ${COLORS.borderGray}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          fontFamily: FONTS.mono,
          fontSize: 12,
          color: '#6b7280',
        }}
      >
        {url}
      </div>
    </div>
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
      {children}
    </div>
  </div>
);

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <div
    style={{
      width: 12,
      height: 12,
      borderRadius: '50%',
      background: color,
    }}
  />
);
