import { loadFont } from '@remotion/google-fonts/Inter';
import { continueRender, delayRender } from 'remotion';

const { fontFamily: interFamily, waitUntilDone } = loadFont('normal', {
  weights: ['400', '500', '600'],
});

const handle = delayRender('Loading Inter font');
waitUntilDone()
  .then(() => continueRender(handle))
  .catch(() => continueRender(handle));

export const FONTS = {
  inter: interFamily,
  mono: 'ui-monospace, "JetBrains Mono", Menlo, Monaco, monospace',
};

export const COLORS = {
  // Surfaces
  bgDark: '#0a0a0a',
  bgDarkSoft: '#0f0f0f',
  surfaceDark: '#141414',
  surfaceDarkRaised: '#1a1a1a',
  darkBorder: '#1f1f1f',
  darkBorderStrong: '#2a2a2a',

  // Text on dark
  white: '#ffffff',
  offWhite: '#fafafa',
  dimText: '#a3a3a3',
  mutedDarkText: '#6b6b6b',

  // Accents (tuned for dark)
  blue: '#4f8aff',
  green: '#22c55e',

  // Light-mode dashboard internals (unchanged)
  black: '#0a0a0a',
  textGray: '#666',
  punctGray: '#999',
  borderGray: '#e5e7eb',
  subtleGray: '#f3f4f6',
  mutedText: '#9ca3af',

  // Terminal (legacy)
  terminalBg: '#0a0a0a',
  terminalText: '#e5e5e5',
  terminalDim: '#888',
};

export const SPRING_SNAPPY = {
  damping: 20,
  stiffness: 130,
  mass: 0.6,
} as const;
