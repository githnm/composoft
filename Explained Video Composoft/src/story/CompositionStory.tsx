import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { FONTS, COLORS } from '../styles';
import { Scene1Hook } from './scenes/Scene1Hook';
import { Scene2Registry } from './scenes/Scene2Registry';
import { Scene3HowItWorks } from './scenes/Scene3HowItWorks';
import { Scene4Northwind } from './scenes/Scene4Northwind';
import { Scene5FitStudio } from './scenes/Scene5FitStudio';
import { Scene6Helios } from './scenes/Scene6Helios';
import { Scene7Reveal } from './scenes/Scene7Reveal';
import { Scene8Final } from './scenes/Scene8Final';

export const ComposoftStory: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: FONTS.inter, background: COLORS.bgDark }}>
      <Sequence from={0} durationInFrames={150} layout="none">
        <Scene1Hook />
      </Sequence>
      <Sequence from={150} durationInFrames={210} layout="none">
        <Scene2Registry />
      </Sequence>
      <Sequence from={360} durationInFrames={180} layout="none">
        <Scene3HowItWorks />
      </Sequence>
      <Sequence from={540} durationInFrames={240} layout="none">
        <Scene4Northwind />
      </Sequence>
      <Sequence from={780} durationInFrames={240} layout="none">
        <Scene5FitStudio />
      </Sequence>
      <Sequence from={1020} durationInFrames={240} layout="none">
        <Scene6Helios />
      </Sequence>
      <Sequence from={1260} durationInFrames={210} layout="none">
        <Scene7Reveal />
      </Sequence>
      <Sequence from={1470} durationInFrames={300} layout="none">
        <Scene8Final />
      </Sequence>
    </AbsoluteFill>
  );
};
