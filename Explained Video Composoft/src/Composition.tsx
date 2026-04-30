import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { Scene1Intro } from './scenes/Scene1Intro';
import { Scene2Brief } from './scenes/Scene2Brief';
import { Scene3Terminal } from './scenes/Scene3Terminal';
import { Scene4Block } from './scenes/Scene4Block';
import { Scene5Bullets } from './scenes/Scene5Bullets';
import { Scene6Final } from './scenes/Scene6Final';
import { FONTS } from './styles';

export const ComposoftLaunch: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: FONTS.inter, background: '#000' }}>
      <Sequence from={0} durationInFrames={180} layout="none">
        <Scene1Intro />
      </Sequence>
      <Sequence from={180} durationInFrames={360} layout="none">
        <Scene2Brief />
      </Sequence>
      <Sequence from={540} durationInFrames={180} layout="none">
        <Scene3Terminal />
      </Sequence>
      <Sequence from={720} durationInFrames={360} layout="none">
        <Scene4Block />
      </Sequence>
      <Sequence from={1080} durationInFrames={300} layout="none">
        <Scene5Bullets />
      </Sequence>
      <Sequence from={1380} durationInFrames={420} layout="none">
        <Scene6Final />
      </Sequence>
    </AbsoluteFill>
  );
};
