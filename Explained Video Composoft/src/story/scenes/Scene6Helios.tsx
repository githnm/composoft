import React from 'react';
import { AbsoluteFill } from 'remotion';
import { CustomerLayout } from '../components/CustomerLayout';
import { SlidePanel } from '../components/SlidePanel';
import { HeliosNetwork } from '../dashboards/HeliosNetwork';
import { ComposerLine } from '../components/ComposerPanel';
import { COLORS } from '../../styles';

const TRANSCRIPT = `"...we sell to general counsel. Long cycles. Stakeholder mapping critical."`;

const COMPOSER_LINES: ComposerLine[] = [
  { text: '→ Composing Helios brief...' },
  { text: '+ OK — generated 2 pages, 5 blocks placed', success: true },
];

export const Scene6Helios: React.FC = () => (
  <AbsoluteFill style={{ background: COLORS.bgDark }}>
    <SlidePanel enter="right" exit="left" enterFrames={12} exitFrames={12}>
      <CustomerLayout
        title="Customer 3  ·  Helios Legal"
        transcript={TRANSCRIPT}
        url="helios.legal.app"
        titleStartFrame={14}
        transcriptStartFrame={30}
        charsPerFrame={2.6}
        composerStartFrame={62}
        composerEndFrame={110}
        composerLines={COMPOSER_LINES}
        composerLineSpacing={22}
        dashboardFrame={114}
        dashboard={<HeliosNetwork />}
      />
    </SlidePanel>
  </AbsoluteFill>
);
