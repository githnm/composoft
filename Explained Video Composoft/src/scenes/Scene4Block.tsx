import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { EditorWindow } from '../components/EditorWindow';
import { SyntaxTypewriter, Token } from '../components/SyntaxTypewriter';
import { COLORS, FONTS } from '../styles';

const CODE = `defineBlock({
  id: "ops.inventory-table",
  config: configSchema,
  data: {
    items: {
      adapter: "inventory-items.list",
      params: {
        warehouseId: { kind: "from-config", path: "warehouseId" }
      },
    },
  },
  actions: {
    adjustStock: { workflow: "inventory.adjust-stock" },
  },
  writes: {
    selectedItem: { kind: "page-state", path: "selection.itemId" },
  },
  component: OpsInventoryTable,
});`;

const SYNTAX = {
  keyword: COLORS.blue,
  string: COLORS.green,
  key: '#000',
  identifier: '#000',
  punct: '#9aa0a6',
};

const KEYWORDS = new Set(['defineBlock']);

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < code.length) {
    const c = code[i];

    if (c === '"') {
      let j = i + 1;
      while (j < code.length && code[j] !== '"') j++;
      tokens.push({ text: code.slice(i, j + 1), color: SYNTAX.string });
      i = j + 1;
      continue;
    }

    if (/[a-zA-Z_$]/.test(c)) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      let k = j;
      while (k < code.length && code[k] === ' ') k++;
      const followedByColon = code[k] === ':';
      let color: string;
      if (KEYWORDS.has(word)) color = SYNTAX.keyword;
      else if (followedByColon) color = SYNTAX.key;
      else color = SYNTAX.identifier;
      tokens.push({ text: word, color });
      i = j;
      continue;
    }

    let j = i;
    while (j < code.length && !/[a-zA-Z_$"]/.test(code[j])) j++;
    tokens.push({ text: code.slice(i, j), color: SYNTAX.punct });
    i = j;
  }
  return tokens;
}

const TOKENS = tokenize(CODE);

export const Scene4Block: React.FC = () => {
  const frame = useCurrentFrame();
  const easeOut = Easing.out(Easing.cubic);

  const editorOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const editorY = interpolate(frame, [0, 25], [12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.offWhite,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          opacity: editorOpacity,
          transform: `translateY(${editorY}px)`,
        }}
      >
        <EditorWindow filename="ops.inventory-table.ts" width={1280}>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 22,
              lineHeight: 1.6,
              color: '#000',
              minHeight: 600,
            }}
          >
            <SyntaxTypewriter
              tokens={TOKENS}
              startFrame={30}
              charsPerFrame={1.6}
              cursorColor="#000"
            />
          </div>
        </EditorWindow>
      </div>
    </AbsoluteFill>
  );
};
