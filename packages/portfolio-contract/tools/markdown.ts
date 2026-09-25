/** @file Markdown, Mermaid, and trace helpers for design-document tests. */

export type SequenceArrow = Readonly<{
  from: string;
  kind: '->>' | '-->>';
  to: string;
  label: string;
}>;

export const makeSequenceRecorder = () => {
  const arrows: SequenceArrow[] = [];
  // XXX Actors naming themselves and their senders is an expedient; users of
  // this recorder rely on actor implementations to report topology accurately.
  const node = (name: string) =>
    harden({
      call(from: string, label: string) {
        arrows.push(harden({ from, kind: '->>', to: name, label }));
      },
      consequence(from: string, label: string) {
        arrows.push(harden({ from, kind: '-->>', to: name, label }));
      },
    });
  return harden({ node, snapshot: () => harden([...arrows]) });
};

export type SequenceRecorder = ReturnType<typeof makeSequenceRecorder>;

export const md = {
  skipToH: (level: number, title: string) => (lines: readonly string[]) => {
    const heading = `${'#'.repeat(level)} ${title}`;
    const at = lines.findIndex(line => line === heading);
    if (at < 0) throw Error(`${heading} not found`);
    return lines.slice(at + 1);
  },

  *eachFence(language: string, lines: readonly string[]) {
    const open = `\`\`\`${language}`;
    for (let at = 0; at < lines.length; at += 1) {
      if (lines[at] !== open) continue;
      const end = lines.indexOf('```', at + 1);
      if (end < 0) throw Error(`unterminated ${language} fence`);
      yield lines.slice(at + 1, end);
      at = end;
    }
  },
};

export const mmd = {
  extractArrows(
    lines: readonly string[],
    nodePattern: RegExp = /\w+/,
  ): readonly SequenceArrow[] {
    const arrowPattern = new RegExp(
      `^\\s*(?<from>${nodePattern.source})\\s*(?<kind>--?>>)\\s*(?<to>${nodePattern.source})\\s*:\\s*(?<label>.*?)\\s*$`,
    );
    return harden(
      lines.flatMap(line => {
        const groups = line.match(arrowPattern)?.groups;
        if (!groups) return [];
        const { from, kind, to, label } = groups;
        return [harden({ from, kind, to, label }) as SequenceArrow];
      }),
    );
  },
};
