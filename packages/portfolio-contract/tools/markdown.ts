/** @file Markdown, Mermaid, and trace helpers for design-document tests. */
import { AsyncLocalStorage } from 'node:async_hooks';

export type SequenceArrow = Readonly<{
  from: string;
  kind: '->>' | '-->>';
  to: string;
  label: string;
}>;

export const formatBigInt = (value: bigint) =>
  value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '_');

export type SequenceArgsRenderer = (args: readonly unknown[]) => string;
export type SequenceResultRenderer = (
  result: unknown,
  args: readonly unknown[],
) => string;

export type SequenceMethodViz = Readonly<
  {
    args?: SequenceArgsRenderer;
    label?: SequenceArgsRenderer;
  } & (
    | { result?: SequenceResultRenderer; resultOnly?: never }
    | { result?: never; resultOnly: SequenceResultRenderer }
  )
>;

export type CausalSequenceViz = Readonly<Record<string, SequenceMethodViz>>;

export type SequenceParticipant = object | readonly object[];

/**
 * Make an E-like causal tracer for sequence-diagram actor simulations.
 * Inspired by Causeway, the message-oriented distributed debugger.
 *
 * Method visualization is currently selected by method name alone. If actors
 * need different visualization for methods with the same name, this can be
 * extended to account for the target participant.
 *
 * @see https://shiftleft.com/mirrors/www.hpl.hp.com/techreports/2009/HPL-2009-78.pdf
 */
export const makeCausalSequenceTracer = (
  methodViz: CausalSequenceViz = harden({}),
) => {
  const arrows: SequenceArrow[] = [];
  const names = new WeakMap<object, string>();
  const proxies = new WeakMap<object, object>();
  const activeActor = new AsyncLocalStorage<object>();
  let starter: object | undefined;

  const participantName = (participant: object) => {
    const name = names.get(participant);
    if (!name) throw Error('sequence participant is not declared');
    return name;
  };

  const formatValue = (value: unknown): string => {
    if (typeof value === 'bigint') return `${formatBigInt(value)}n`;
    if (typeof value === 'string') return `'${value}'`;
    return JSON.stringify(value, (_key, item) =>
      typeof item === 'bigint' ? `${item}n` : item,
    );
  };

  const send = <Target extends object>(target: Target): Target => {
    const extant = proxies.get(target);
    if (extant) return extant as Target;
    participantName(target);

    const proxy = new Proxy(Object.create(null) as object, {
      get: (_proxyTarget, property) => {
        const method = Reflect.get(target, property);
        if (typeof method !== 'function' || typeof property !== 'string') {
          return method;
        }
        return (...args: unknown[]) => {
          const activeSender = activeActor.getStore();
          const sender = activeSender ?? starter;
          if (!sender) throw Error('ES.start(participant) is required');
          const isStart = activeSender === undefined;
          if (isStart && sender !== target) {
            throw Error('the started participant must receive the first send');
          }
          if (isStart) starter = undefined;

          const viz = methodViz[property];
          const abbreviated = viz?.args?.(args);
          const shownArgs = abbreviated ?? args.map(formatValue).join(', ');
          const label = viz?.label?.(args) ?? `${property}(${shownArgs})`;
          const renderResultOnly = viz?.resultOnly;
          if (!renderResultOnly) {
            arrows.push(
              harden({
                from: participantName(sender),
                kind: isStart ? '->>' : '-->>',
                to: participantName(target),
                label,
              }),
            );
          }

          const result = activeActor.run(target, () =>
            Reflect.apply(method, target, args),
          );
          const renderResult = renderResultOnly ?? viz?.result;
          if (renderResult) {
            arrows.push(
              harden({
                from: participantName(target),
                kind: '-->>',
                to: participantName(sender),
                label: renderResult(result, args),
              }),
            );
          }
          return result;
        };
      },
    });
    proxies.set(target, proxy);
    return proxy as Target;
  };

  const ES = Object.assign(send, {
    declareParticipants(
      participants: Readonly<Record<string, SequenceParticipant>>,
    ) {
      for (const [name, participantOrAliases] of Object.entries(participants)) {
        const aliases = Array.isArray(participantOrAliases)
          ? participantOrAliases
          : [participantOrAliases];
        if (aliases.length === 0) {
          throw Error(`sequence participant ${name} has no objects`);
        }
        for (const participant of aliases) {
          if (names.has(participant)) {
            throw Error('participant already declared');
          }
          names.set(participant, name);
        }
      }
    },
    snapshot: () => harden([...arrows]),
    start(participant: object) {
      participantName(participant);
      if (activeActor.getStore() || starter) {
        throw Error('a sequence is already active');
      }
      starter = participant;
    },
  });
  return harden(ES);
};

export type CausalSequenceTracer = ReturnType<typeof makeCausalSequenceTracer>;

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
