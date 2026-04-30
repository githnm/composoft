import React from 'react';
import { AbsoluteFill } from 'remotion';
import { CustomerLayout } from '../components/CustomerLayout';
import { SlidePanel } from '../components/SlidePanel';
import { NorthwindKanban } from '../dashboards/NorthwindKanban';
import { ComposerLine } from '../components/ComposerPanel';
import { COLORS } from '../../styles';

const TRANSCRIPT = `"...we're enterprise sales, six-month cycles. We need MEDDIC scoring on every deal. The team focuses on champion identification. Forget the consumer features."`;

const COMPOSER_LINES: ComposerLine[] = [
  { text: '→ Reading registry: 4 layers, 12 blocks, 8 adapters' },
  { text: '→ Composing brief...' },
  { text: '+ OK — generated 3 pages, 7 blocks placed', success: true },
];

export const Scene4Northwind: React.FC = () => (
  <AbsoluteFill style={{ background: COLORS.bgDark }}>
    <SlidePanel enter="fade" exit="left" enterFrames={10} exitFrames={12}>
      <CustomerLayout
        title="Customer 1  ·  Northwind  ·  B2B SaaS"
        transcript={TRANSCRIPT}
        url="northwind.crm.app"
        titleStartFrame={12}
        transcriptStartFrame={28}
        charsPerFrame={3.4}
        composerStartFrame={95}
        composerEndFrame={160}
        composerLines={COMPOSER_LINES}
        composerLineSpacing={20}
        dashboardFrame={165}
        dashboard={<NorthwindKanban />}
      />
    </SlidePanel>
  </AbsoluteFill>
);
