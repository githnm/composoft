import React from 'react';
import { AbsoluteFill } from 'remotion';
import { CustomerLayout } from '../components/CustomerLayout';
import { SlidePanel } from '../components/SlidePanel';
import { FitStudioCalendar } from '../dashboards/FitStudioCalendar';
import { ComposerLine } from '../components/ComposerPanel';
import { COLORS } from '../../styles';

const TRANSCRIPT = `"...we run group classes. Members book by instructor. Need waitlist management and SMS reminders. Don't care about deal stages."`;

const COMPOSER_LINES: ComposerLine[] = [
  { text: '→ Composing FitStudio brief...' },
  { text: '+ OK — generated 2 pages, 4 blocks placed', success: true },
];

export const Scene5FitStudio: React.FC = () => (
  <AbsoluteFill style={{ background: COLORS.bgDark }}>
    <SlidePanel enter="right" exit="left" enterFrames={12} exitFrames={12}>
      <CustomerLayout
        title="Customer 2  ·  FitStudio Yoga  ·  consumer"
        transcript={TRANSCRIPT}
        url="fitstudio.bookings.app"
        titleStartFrame={14}
        transcriptStartFrame={30}
        charsPerFrame={3.0}
        composerStartFrame={82}
        composerEndFrame={130}
        composerLines={COMPOSER_LINES}
        composerLineSpacing={22}
        dashboardFrame={135}
        dashboard={<FitStudioCalendar />}
      />
    </SlidePanel>
  </AbsoluteFill>
);
