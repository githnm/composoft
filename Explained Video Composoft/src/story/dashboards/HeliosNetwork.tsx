import React from 'react';
import { COLORS, FONTS } from '../../styles';

type Stakeholder = {
  name: string;
  role: string;
  influence: 'champion' | 'decision' | 'influencer' | 'blocker';
  x: number;
  y: number;
};

const STAKEHOLDERS: Stakeholder[] = [
  { name: 'Margaret Wells', role: 'General Counsel', influence: 'decision', x: 0.78, y: 0.28 },
  { name: 'David Park', role: 'Deputy GC', influence: 'champion', x: 0.22, y: 0.30 },
  { name: 'Elena Sokolova', role: 'Compliance Lead', influence: 'influencer', x: 0.82, y: 0.62 },
  { name: 'Trevor Hollis', role: 'IT Director', influence: 'influencer', x: 0.18, y: 0.62 },
  { name: 'Patricia Yoon', role: 'CFO', influence: 'blocker', x: 0.45, y: 0.10 },
  { name: 'Mark Devlin', role: 'CEO', influence: 'decision', x: 0.50, y: 0.85 },
];

const CENTER = { x: 0.5, y: 0.45 };

const INFLUENCE_LABEL: Record<Stakeholder['influence'], string> = {
  champion: 'Champion',
  decision: 'Decision-maker',
  influencer: 'Influencer',
  blocker: 'Blocker',
};

const INFLUENCE_COLOR: Record<Stakeholder['influence'], string> = {
  champion: COLORS.blue,
  decision: COLORS.black,
  influencer: '#6b7280',
  blocker: '#9ca3af',
};

export const HeliosNetwork: React.FC = () => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: FONTS.inter,
      background: '#fff',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 22px',
        borderBottom: `1px solid ${COLORS.borderGray}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 15,
          fontWeight: 500,
          color: COLORS.black,
        }}
      >
        Helios Legal <span style={{ color: COLORS.mutedText }}>·</span>{' '}
        <span style={{ color: '#374151', fontWeight: 400 }}>
          Stakeholder map
        </span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: COLORS.mutedText,
          fontFamily: FONTS.mono,
        }}
      >
        Brookfield Holdings · Q2 deal
      </div>
    </div>

    <div style={{ flex: 1, display: 'flex' }}>
      <div
        style={{
          flex: 1,
          position: 'relative',
          background: '#fafafa',
          borderRight: `1px solid ${COLORS.borderGray}`,
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0 }}
        >
          {STAKEHOLDERS.map((s) => (
            <line
              key={s.name}
              x1={CENTER.x * 100}
              y1={CENTER.y * 100}
              x2={s.x * 100}
              y2={s.y * 100}
              stroke={INFLUENCE_COLOR[s.influence]}
              strokeWidth={s.influence === 'decision' || s.influence === 'champion' ? 0.25 : 0.15}
              strokeOpacity={s.influence === 'decision' || s.influence === 'champion' ? 0.5 : 0.25}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <div
          style={{
            position: 'absolute',
            left: `${CENTER.x * 100}%`,
            top: `${CENTER.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            background: COLORS.black,
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 130,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Deal
          </div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Brookfield</div>
          <div style={{ fontSize: 11, opacity: 0.7, fontFamily: FONTS.mono }}>
            $1.2M · Q2
          </div>
        </div>

        {STAKEHOLDERS.map((s) => (
          <PersonNode key={s.name} s={s} />
        ))}
      </div>

      <div
        style={{
          width: 200,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.black }}>
            Stakeholders
          </div>
          <div
            style={{
              fontSize: 10,
              color: COLORS.mutedText,
              fontFamily: FONTS.mono,
            }}
          >
            {STAKEHOLDERS.length}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STAKEHOLDERS.map((s) => (
            <div
              key={s.name}
              style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: INFLUENCE_COLOR[s.influence],
                  }}
                />
                <div style={{ fontSize: 11, color: COLORS.black, fontWeight: 500 }}>
                  {s.name.split(' ')[0]} {s.name.split(' ')[1]?.[0]}.
                </div>
              </div>
              <div style={{ fontSize: 10, color: COLORS.mutedText, paddingLeft: 12 }}>
                {INFLUENCE_LABEL[s.influence]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const PersonNode: React.FC<{ s: Stakeholder }> = ({ s }) => (
  <div
    style={{
      position: 'absolute',
      left: `${s.x * 100}%`,
      top: `${s.y * 100}%`,
      transform: 'translate(-50%, -50%)',
      background: '#fff',
      border: `1px solid ${
        s.influence === 'decision' || s.influence === 'champion'
          ? '#d1d5db'
          : COLORS.borderGray
      }`,
      borderLeft: `3px solid ${INFLUENCE_COLOR[s.influence]}`,
      padding: '7px 10px',
      borderRadius: 6,
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      minWidth: 110,
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
    }}
  >
    <div style={{ fontSize: 10, fontWeight: 500, color: COLORS.black }}>
      {s.name}
    </div>
    <div style={{ fontSize: 9, color: COLORS.mutedText }}>{s.role}</div>
  </div>
);
