import React from 'react';
import { Composition } from 'remotion';
import { ComposoftLaunch } from './Composition';
import { ComposoftStory } from './story/CompositionStory';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ComposoftLaunch"
        component={ComposoftLaunch}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ComposoftStory"
        component={ComposoftStory}
        durationInFrames={1770}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
