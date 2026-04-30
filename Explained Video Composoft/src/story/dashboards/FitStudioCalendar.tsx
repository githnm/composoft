import React from 'react';
import { COLORS, FONTS } from '../../styles';

type Cls = {
  instructor: string;
  name: string;
  booked: number;
  capacity: number;
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = ['6:00', '8:00', '10:00', '17:00', '18:30', '20:00'];

const CLASSES: Record<string, Cls> = {
  'Mon-6:00': { instructor: 'Sarah K', name: 'Vinyasa', booked: 8, capacity: 12 },
  'Mon-18:30': { instructor: 'Tom L', name: 'Hot Yoga', booked: 14, capacity: 15 },
  'Tue-8:00': { instructor: 'Mira P', name: 'Power', booked: 12, capacity: 15 },
  'Tue-17:00': { instructor: 'James M', name: 'Yin', booked: 5, capacity: 8 },
  'Wed-6:00': { instructor: 'Sarah K', name: 'Vinyasa', booked: 9, capacity: 12 },
  'Wed-20:00': { instructor: 'Sarah K', name: 'Restorative', booked: 4, capacity: 10 },
  'Thu-8:00': { instructor: 'Mira P', name: 'Power', booked: 15, capacity: 15 },
  'Thu-18:30': { instructor: 'Tom L', name: 'Hot Yoga', booked: 11, capacity: 15 },
  'Fri-10:00': { instructor: 'James M', name: 'Yin', booked: 6, capacity: 8 },
  'Sat-8:00': { instructor: 'Mira P', name: 'Power', booked: 13, capacity: 15 },
  'Sat-10:00': { instructor: 'Sarah K', name: 'Vinyasa', booked: 10, capacity: 12 },
  'Sun-10:00': { instructor: 'James M', name: 'Yin', booked: 7, capacity: 8 },
};

const WAITLIST = [
  { name: 'Emma R.', class: 'Hot Yoga · Mon 18:30' },
  { name: 'Jasmine L.', class: 'Power · Thu 8:00' },
  { name: 'Noah K.', class: 'Power · Thu 8:00' },
  { name: 'Liam C.', class: 'Vinyasa · Mon 6:00' },
];

const SMS_QUEUE = [
  { time: 'in 2h', count: 14, label: 'Class reminder · Hot Yoga 18:30' },
  { time: 'in 14h', count: 8, label: 'Class reminder · Vinyasa 6:00' },
  { time: 'tomorrow', count: 27, label: 'Weekly summary' },
];

export const FitStudioCalendar: React.FC = () => (
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
        FitStudio <span style={{ color: COLORS.mutedText }}>·</span>{' '}
        <span style={{ color: '#374151', fontWeight: 400 }}>Bookings</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <SmallPill label="This week" active />
        <SmallPill label="All instructors" />
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
          border: `1px solid ${COLORS.borderGray}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '50px repeat(7, 1fr)',
            background: '#fafafa',
            borderBottom: `1px solid ${COLORS.borderGray}`,
          }}
        >
          <div />
          {DAYS.map((d) => (
            <div
              key={d}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#374151',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                textAlign: 'center',
                padding: '8px 0',
              }}
            >
              {d}
            </div>
          ))}
        </div>
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateRows: `repeat(${TIMES.length}, 1fr)`,
          }}
        >
          {TIMES.map((time) => (
            <div
              key={time}
              style={{
                display: 'grid',
                gridTemplateColumns: '50px repeat(7, 1fr)',
                borderBottom: `1px solid ${COLORS.borderGray}`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: COLORS.mutedText,
                  fontFamily: FONTS.mono,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fafafa',
                  borderRight: `1px solid ${COLORS.borderGray}`,
                }}
              >
                {time}
              </div>
              {DAYS.map((d) => {
                const cls = CLASSES[`${d}-${time}`];
                return (
                  <div
                    key={`${d}-${time}`}
                    style={{
                      borderRight:
                        d !== 'Sun' ? `1px solid ${COLORS.borderGray}` : 'none',
                      padding: 4,
                    }}
                  >
                    {cls ? <CalendarBlock cls={cls} /> : null}
                  </div>
                );
              })}
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
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.black }}>
              Waitlist
            </div>
            <div
              style={{
                fontSize: 10,
                color: COLORS.mutedText,
                fontFamily: FONTS.mono,
              }}
            >
              {WAITLIST.length}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {WAITLIST.map((w) => (
              <div key={w.name + w.class} style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 11, color: COLORS.black }}>
                  {w.name}
                </div>
                <div style={{ fontSize: 10, color: COLORS.mutedText }}>
                  {w.class}
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
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.black }}>
              SMS queue
            </div>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: COLORS.green,
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SMS_QUEUE.map((s) => (
              <div key={s.label} style={{ lineHeight: 1.3 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 10,
                  }}
                >
                  <span style={{ color: COLORS.mutedText }}>{s.time}</span>
                  <span
                    style={{
                      color: COLORS.mutedText,
                      fontFamily: FONTS.mono,
                    }}
                  >
                    {s.count}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#374151' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const CalendarBlock: React.FC<{ cls: Cls }> = ({ cls }) => {
  const ratio = cls.booked / cls.capacity;
  const isFull = cls.booked === cls.capacity;
  return (
    <div
      style={{
        background: isFull ? 'rgba(59, 130, 246, 0.07)' : '#fafafa',
        border: `1px solid ${isFull ? 'rgba(59, 130, 246, 0.25)' : COLORS.borderGray}`,
        borderRadius: 5,
        padding: '4px 6px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 500,
          color: COLORS.black,
          lineHeight: 1.1,
        }}
      >
        {cls.name}
      </div>
      <div
        style={{
          fontSize: 8,
          color: COLORS.mutedText,
          lineHeight: 1.1,
        }}
      >
        {cls.instructor}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
        <div
          style={{
            flex: 1,
            height: 2,
            background: '#e5e7eb',
            borderRadius: 1,
          }}
        >
          <div
            style={{
              width: `${ratio * 100}%`,
              height: '100%',
              background: isFull ? COLORS.blue : '#6b7280',
              borderRadius: 1,
            }}
          />
        </div>
        <div
          style={{
            fontSize: 8,
            color: COLORS.mutedText,
            fontFamily: FONTS.mono,
          }}
        >
          {cls.booked}/{cls.capacity}
        </div>
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
