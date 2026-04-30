import React from 'react';
import { COLORS, FONTS } from '../../styles';

type Grant = {
  name: string;
  donor: string;
  amount: string;
  start: number;
  end: number;
  status: 'active' | 'pending' | 'renewal';
};

const GRANTS: Grant[] = [
  {
    name: 'Coastal Restoration',
    donor: 'Hewlett Foundation',
    amount: '$420K',
    start: 0,
    end: 0.55,
    status: 'active',
  },
  {
    name: 'Urban Forestry',
    donor: 'Packard',
    amount: '$180K',
    start: 0.05,
    end: 0.45,
    status: 'renewal',
  },
  {
    name: 'River Watch',
    donor: 'Walton Family',
    amount: '$95K',
    start: 0.15,
    end: 0.7,
    status: 'active',
  },
  {
    name: 'Pollinator Project',
    donor: 'Moore Foundation',
    amount: '$215K',
    start: 0.3,
    end: 0.9,
    status: 'active',
  },
  {
    name: 'Community Gardens',
    donor: 'Local · Anonymous',
    amount: '$60K',
    start: 0.5,
    end: 0.85,
    status: 'pending',
  },
  {
    name: 'Trail Stewardship',
    donor: 'REI Co-op',
    amount: '$45K',
    start: 0.65,
    end: 1.0,
    status: 'active',
  },
];

const RENEWALS = [
  { name: 'Urban Forestry', days: 18, amount: '$180K' },
  { name: 'Hewlett Cycle 4', days: 47, amount: '$420K' },
  { name: 'River Watch', days: 92, amount: '$95K' },
];

const QUARTERS = ['Q1 2026', 'Q2', 'Q3', 'Q4'];

const STATUS_COLOR: Record<Grant['status'], string> = {
  active: COLORS.black,
  pending: '#9ca3af',
  renewal: COLORS.blue,
};

const STATUS_BG: Record<Grant['status'], string> = {
  active: '#1f2937',
  pending: '#e5e7eb',
  renewal: 'rgba(59, 130, 246, 0.85)',
};

export const GreenfieldTimeline: React.FC = () => (
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
        Greenfield <span style={{ color: COLORS.mutedText }}>·</span>{' '}
        <span style={{ color: '#374151', fontWeight: 400 }}>Grant pipeline</span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: COLORS.mutedText,
          fontFamily: FONTS.mono,
        }}
      >
        $1.0M committed · 6 active
      </div>
    </div>

    <div
      style={{
        flex: 1,
        display: 'flex',
        gap: 14,
        padding: 18,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#fafafa',
          border: `1px solid ${COLORS.borderGray}`,
          borderRadius: 10,
          padding: 14,
          gap: 10,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr',
            alignItems: 'center',
          }}
        >
          <div />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              borderBottom: `1px solid ${COLORS.borderGray}`,
              paddingBottom: 6,
            }}
          >
            {QUARTERS.map((q) => (
              <div
                key={q}
                style={{
                  fontSize: 10,
                  color: '#374151',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {q}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            flex: 1,
          }}
        >
          {GRANTS.map((g) => (
            <div
              key={g.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.black }}>
                  {g.name}
                </div>
                <div style={{ fontSize: 9, color: COLORS.mutedText }}>
                  {g.donor}
                </div>
              </div>
              <div
                style={{
                  position: 'relative',
                  height: 22,
                  background: '#fff',
                  borderRadius: 4,
                  border: `1px solid ${COLORS.borderGray}`,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: `${g.start * 100}%`,
                    width: `${(g.end - g.start) * 100}%`,
                    top: 0,
                    bottom: 0,
                    background: STATUS_BG[g.status],
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: '#fff',
                      fontFamily: FONTS.mono,
                      fontWeight: 500,
                      textShadow: '0 1px 0 rgba(0,0,0,0.15)',
                    }}
                  >
                    {g.amount}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          width: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            background: '#fff',
            border: `1px solid ${COLORS.borderGray}`,
            borderRadius: 10,
            padding: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.black }}>
              Renewals
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 500,
                padding: '2px 6px',
                background: 'rgba(59, 130, 246, 0.1)',
                color: COLORS.blue,
                borderRadius: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Action
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {RENEWALS.map((r) => (
              <div
                key={r.name}
                style={{ display: 'flex', flexDirection: 'column', gap: 3 }}
              >
                <div style={{ fontSize: 11, color: COLORS.black, fontWeight: 500 }}>
                  {r.name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 10,
                  }}
                >
                  <span
                    style={{
                      color: r.days < 30 ? COLORS.blue : COLORS.mutedText,
                      fontFamily: FONTS.mono,
                    }}
                  >
                    {r.days}d
                  </span>
                  <span
                    style={{
                      color: COLORS.mutedText,
                      fontFamily: FONTS.mono,
                    }}
                  >
                    {r.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            border: `1px solid ${COLORS.borderGray}`,
            borderRadius: 10,
            padding: 14,
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: COLORS.black,
              marginBottom: 10,
            }}
          >
            Top donors
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <DonorRow name="Hewlett Foundation" amount="$420K" />
            <DonorRow name="Moore Foundation" amount="$215K" />
            <DonorRow name="Packard" amount="$180K" />
            <DonorRow name="Walton Family" amount="$95K" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const DonorRow: React.FC<{ name: string; amount: string }> = ({
  name,
  amount,
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      fontSize: 11,
    }}
  >
    <span style={{ color: COLORS.black }}>{name}</span>
    <span style={{ color: COLORS.mutedText, fontFamily: FONTS.mono }}>
      {amount}
    </span>
  </div>
);
