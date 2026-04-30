import React from 'react';
import { COLORS, FONTS } from '../../styles';

type Lead = {
  name: string;
  initials: string;
  company: string;
  source: string;
  age: string;
  hot?: boolean;
};

const LEADS: Lead[] = [
  {
    name: 'Jordan Smith',
    initials: 'JS',
    company: 'TechFlow',
    source: 'Demo request',
    age: '5m',
    hot: true,
  },
  {
    name: 'Riley Chen',
    initials: 'RC',
    company: 'DataSync',
    source: 'Pricing page · 4 visits',
    age: '12m',
    hot: true,
  },
  {
    name: 'Casey Park',
    initials: 'CP',
    company: 'CloudOps',
    source: 'Webinar · enterprise',
    age: '18m',
  },
  {
    name: 'Avery Lee',
    initials: 'AL',
    company: 'Stackpath',
    source: 'Inbound · contact form',
    age: '24m',
  },
  {
    name: 'Morgan Cole',
    initials: 'MC',
    company: 'Pivot Inc',
    source: 'Outbound · reply',
    age: '32m',
  },
  {
    name: 'Devon Ortiz',
    initials: 'DO',
    company: 'Helix Labs',
    source: 'Inbound · referral',
    age: '47m',
  },
];

const FILTERS = [
  { label: 'All', count: 24, active: true },
  { label: 'Hot', count: 8 },
  { label: 'New today', count: 6 },
  { label: 'Assigned to me', count: 12 },
];

export const AcmeInbox: React.FC = () => (
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
        Acme Sales <span style={{ color: COLORS.mutedText }}>·</span>{' '}
        <span style={{ color: '#374151', fontWeight: 400 }}>Inbox</span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: COLORS.mutedText,
          fontFamily: FONTS.mono,
        }}
      >
        Round-robin · You're up next
      </div>
    </div>

    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '12px 22px',
        borderBottom: `1px solid ${COLORS.borderGray}`,
      }}
    >
      {FILTERS.map((f) => (
        <div
          key={f.label}
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            fontSize: 11,
            padding: '5px 11px',
            borderRadius: 6,
            background: f.active ? COLORS.black : '#fff',
            color: f.active ? '#fff' : '#374151',
            border: f.active ? '1px solid transparent' : `1px solid ${COLORS.borderGray}`,
          }}
        >
          <span>{f.label}</span>
          <span
            style={{
              fontSize: 10,
              color: f.active ? 'rgba(255,255,255,0.65)' : COLORS.mutedText,
              fontFamily: FONTS.mono,
            }}
          >
            {f.count}
          </span>
        </div>
      ))}
    </div>

    <div
      style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {LEADS.map((lead, i) => (
        <LeadRow key={lead.name} lead={lead} highlighted={i === 0} />
      ))}
    </div>
  </div>
);

const LeadRow: React.FC<{ lead: Lead; highlighted?: boolean }> = ({
  lead,
  highlighted,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 22px',
      borderBottom: `1px solid ${COLORS.borderGray}`,
      background: highlighted ? 'rgba(59, 130, 246, 0.04)' : '#fff',
      gap: 14,
    }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: highlighted ? COLORS.blue : COLORS.subtleGray,
        color: highlighted ? '#fff' : '#374151',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      {lead.initials}
    </div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.black }}>
          {lead.name}
        </div>
        <div style={{ fontSize: 12, color: COLORS.mutedText }}>
          {lead.company}
        </div>
        {lead.hot ? (
          <div
            style={{
              fontSize: 9,
              fontWeight: 500,
              padding: '1px 6px',
              background: 'rgba(59, 130, 246, 0.1)',
              color: COLORS.blue,
              borderRadius: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Hot
          </div>
        ) : null}
      </div>
      <div style={{ fontSize: 11, color: COLORS.mutedText }}>{lead.source}</div>
    </div>
    <div
      style={{
        fontSize: 11,
        color: COLORS.mutedText,
        fontFamily: FONTS.mono,
        marginRight: 6,
      }}
    >
      {lead.age}
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      <ActionPill label="Call" primary={highlighted} />
      <ActionPill label="Email" />
      <ActionPill label="Skip" muted />
    </div>
  </div>
);

const ActionPill: React.FC<{
  label: string;
  primary?: boolean;
  muted?: boolean;
}> = ({ label, primary, muted }) => (
  <div
    style={{
      fontSize: 11,
      padding: '5px 12px',
      borderRadius: 6,
      background: primary ? COLORS.black : '#fff',
      color: primary ? '#fff' : muted ? COLORS.mutedText : '#374151',
      border: primary ? '1px solid transparent' : `1px solid ${COLORS.borderGray}`,
    }}
  >
    {label}
  </div>
);
