import React from 'react';
import { COLORS, FONTS } from '../../styles';

type Deal = {
  company: string;
  value: string;
  score: number;
};

const COLUMNS: Array<{ title: string; deals: Deal[] }> = [
  {
    title: 'Discovery',
    deals: [
      { company: 'Acme Corp', value: '$84K', score: 72 },
      { company: 'Globex', value: '$156K', score: 68 },
      { company: 'Hooli', value: '$42K', score: 65 },
    ],
  },
  {
    title: 'Champion identified',
    deals: [
      { company: 'Initech', value: '$210K', score: 81 },
      { company: 'Massive Dynamic', value: '$98K', score: 78 },
    ],
  },
  {
    title: 'MEDDIC validated',
    deals: [
      { company: 'Stark Industries', value: '$340K', score: 91 },
      { company: 'Wayne Enterprises', value: '$128K', score: 86 },
    ],
  },
  {
    title: 'Closed Won',
    deals: [
      { company: 'Pied Piper', value: '$76K', score: 95 },
      { company: 'Soylent', value: '$52K', score: 90 },
      { company: 'Wonka Industries', value: '$190K', score: 93 },
    ],
  },
];

const CHAMPIONS = [
  { name: 'Sarah Chen', company: 'Stark Industries', strength: 92 },
  { name: 'Marcus Park', company: 'Wayne Ent.', strength: 88 },
  { name: 'Priya Singh', company: 'Initech', strength: 76 },
  { name: 'Diego Rivera', company: 'Massive Dynamic', strength: 71 },
  { name: 'Anna Volkov', company: 'Globex', strength: 54 },
];

export const NorthwindKanban: React.FC = () => (
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
        Northwind <span style={{ color: COLORS.mutedText }}>·</span>{' '}
        <span style={{ color: '#374151', fontWeight: 400 }}>Pipeline</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <SmallPill label="This quarter" active />
        <SmallPill label="All reps" />
        <SmallPill label="Filter" />
      </div>
    </div>

    <div
      style={{
        flex: 1,
        display: 'flex',
        gap: 18,
        padding: 18,
        background: '#fafafa',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {COLUMNS.map((col) => (
          <div
            key={col.title}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {col.title}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: COLORS.mutedText,
                  fontFamily: FONTS.mono,
                }}
              >
                {col.deals.length}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.deals.map((deal) => (
                <DealCard key={deal.company} deal={deal} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          width: 220,
          background: '#fff',
          border: `1px solid ${COLORS.borderGray}`,
          borderRadius: 10,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.black }}>
            Champion radar
          </div>
          <div style={{ fontSize: 11, color: COLORS.mutedText }}>5</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CHAMPIONS.map((c) => (
            <div
              key={c.name}
              style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <div style={{ fontSize: 12, color: COLORS.black }}>
                  {c.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: COLORS.mutedText,
                    fontFamily: FONTS.mono,
                  }}
                >
                  {c.strength}
                </div>
              </div>
              <div style={{ fontSize: 10, color: COLORS.mutedText }}>
                {c.company}
              </div>
              <div
                style={{
                  height: 3,
                  background: COLORS.subtleGray,
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    width: `${c.strength}%`,
                    height: '100%',
                    background:
                      c.strength >= 85 ? COLORS.blue : '#9ca3af',
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const DealCard: React.FC<{ deal: Deal }> = ({ deal }) => {
  const isHot = deal.score >= 90;
  const isStrong = deal.score >= 80 && deal.score < 90;
  const badgeColor = isHot
    ? COLORS.blue
    : isStrong
      ? '#374151'
      : '#9ca3af';
  const badgeBg = isHot
    ? 'rgba(59, 130, 246, 0.1)'
    : isStrong
      ? '#f3f4f6'
      : '#f9fafb';

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${COLORS.borderGray}`,
        borderRadius: 8,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: COLORS.black,
            lineHeight: 1.3,
          }}
        >
          {deal.company}
        </div>
        <div
          style={{
            background: badgeBg,
            color: badgeColor,
            fontSize: 10,
            fontWeight: 500,
            fontFamily: FONTS.mono,
            padding: '2px 6px',
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          {deal.score}
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: COLORS.mutedText,
          fontFamily: FONTS.mono,
        }}
      >
        {deal.value}
      </div>
    </div>
  );
};

const SmallPill: React.FC<{ label: string; active?: boolean }> = ({
  label,
  active,
}) => (
  <div
    style={{
      fontSize: 11,
      padding: '4px 10px',
      borderRadius: 6,
      background: active ? COLORS.subtleGray : '#fff',
      border: `1px solid ${COLORS.borderGray}`,
      color: active ? COLORS.black : COLORS.textGray,
    }}
  >
    {label}
  </div>
);
