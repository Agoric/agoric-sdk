/**
 * @file Simulation synchronized with the Withdraw diagram in `evm-wallet.md`.
 *
 * Diagram convention:
 * - `->>` is a spontaneous initiating action; `-->>` is a consequence.
 *
 * Actor conventions:
 * - Tests initiate spontaneous actions. Each receiving actor records its
 *   message through a `viz.node()` and invokes its own consequences.
 * - Construction reflects knowledge and ownership, for example:
 *   User(+Metamask) -> UI -> EMS.
 * - Participant declarations, notes, and label formatting are documentation.
 *   The test checks message topology and order without labels, then separately
 *   parses transfer labels to compare their domain semantics with simulation.
 */
import '@endo/init/debug.js';

import type { AxelarChain } from '@agoric/portfolio-api';
import test from 'ava';
import { readFile } from 'node:fs/promises';

const evmDesignDoc = new URL('../docs-design/evm-wallet.md', import.meta.url);

type ActorName = string;
type ArrowKind = '->>' | '-->>';
type Arrow = Readonly<{
  from: ActorName;
  kind: ArrowKind;
  to: ActorName;
  label: string;
}>;

const makeSequenceRecorder = () => {
  const arrows: Arrow[] = [];
  // XXX Letting actors name themselves and their senders is an expedient; the
  // test relies on actor implementations to report message topology accurately.
  const node = <Name extends ActorName>(name: Name) =>
    harden({
      call(from: ActorName, label: string) {
        arrows.push(harden({ from, kind: '->>', to: name, label }));
      },
      consequence(from: ActorName, label: string) {
        arrows.push(harden({ from, kind: '-->>', to: name, label }));
      },
    });
  return harden({ node, snapshot: () => harden([...arrows]) });
};

type Recorder = ReturnType<typeof makeSequenceRecorder>;
type Chain = Readonly<{ name: AxelarChain; chainId: number }>;
/** Account-boundary movements; position-to-position movements are not modeled. */
type RemoteAccountTransfer =
  | Readonly<{
      source: `+${AxelarChain}`; // deposit
      amount: bigint;
      destination: `@${AxelarChain}`;
    }>
  | Readonly<{
      source: `@${AxelarChain}`;
      amount: bigint;
      destination: `-${AxelarChain}`; // withdraw
    }>;

const makeRemoteAccount = (viz: Recorder, chain: AxelarChain) => {
  const node = viz.node('A');
  const source = `@${chain}` as `@${AxelarChain}`;
  const transfers: RemoteAccountTransfer[] = [];
  return harden({
    transfer(from: 'YC', amount: bigint, destination: `+${AxelarChain}`) {
      node.consequence(
        from,
        `${source}.transfer(${amount}, \`${destination}\`)`,
      );
      transfers.push(harden({ source, amount, destination }));
    },
    transfers: () => harden([...transfers]),
  });
};

type RemoteAccount = Readonly<{
  transfer(from: 'YC', amount: bigint, destination: `-${AxelarChain}`): void;
  transfers(): readonly RemoteAccountTransfer[];
}>;

const makeYmaxContract = (viz: Recorder) => {
  const node = viz.node('YC');
  let account: Readonly<{ chain: Chain; remote: RemoteAccount }> | undefined;
  return harden({
    setupAccount(chain: Chain) {
      account = harden({ chain, remote: makeRemoteAccount(viz, chain.name) });
    },
    withdraw(from: 'EMH', amount: bigint, chainId: number, done: () => void) {
      if (!account) throw Error('remote account not provisioned');
      if (chainId !== account.chain.chainId) throw Error('chainId mismatch');
      node.consequence(from, `Withdraw(${amount} USDC, chainId=${chainId})`);
      const destination = `-${account.chain.name}` as `-${AxelarChain}`;
      return harden({
        flow: 'portfolio123<br/>flow2',
        execute() {
          assert(account);
          account.remote.transfer('YC', amount, destination);
          done();
        },
      });
    },
    transfers() {
      if (!account) throw Error('remote account not provisioned');
      return account.remote.transfers();
    },
  });
};

type YmaxContract = ReturnType<typeof makeYmaxContract>;

const makeEMH = (viz: Recorder, ymax: YmaxContract) => {
  const node = viz.node('EMH');
  return harden({
    handle(
      from: 'EMS',
      amount: bigint,
      chainId: number,
      flowStarted: (flow: string) => void,
      done: () => void,
    ) {
      node.consequence(
        from,
        'handleMessage(Withdraw712,<br/>signature, verifiedSigner)',
      );
      node.consequence(
        'EMH',
        'validate message structure,<br/>nonce, deadline',
      );
      node.consequence('EMH', 'extract operation,<br/>chainId from domain');
      const operation = ymax.withdraw('EMH', amount, chainId, done);
      node.consequence('YC', operation.flow);
      flowStarted(operation.flow);
      operation.execute();
    },
  });
};

type EMH = ReturnType<typeof makeEMH>;

const makeEMS = (viz: Recorder, emh: EMH) => {
  const node = viz.node('EMS');
  return harden({
    submit(
      from: 'D',
      amount: bigint,
      chainId: number,
      flowStarted: (flow: string) => void,
      done: () => void,
    ) {
      node.consequence(from, 'Withdraw712, signature,<br>address');
      emh.handle('EMS', amount, chainId, flowStarted, done);
    },
  });
};

type EMS = ReturnType<typeof makeEMS>;

const makeMetamask = (
  viz: Recorder,
  confirm: (label: string, approve: () => void) => void,
) => {
  const node = viz.node('MM');
  return harden({
    sign(from: 'D', amount: bigint, chainId: number, signed: () => void) {
      node.consequence(
        from,
        `Withdraw712(${amount} USDC,nonce543,deadline)<br/>domain.chainId=${chainId}`,
      );
      confirm(`Withdraw712(${amount} USDC,nonce543,deadline) ok?`, () => {
        node.consequence('U', 'ok');
        signed();
      });
    },
  });
};

type Metamask = ReturnType<typeof makeMetamask>;

const makeUI = (viz: Recorder, ems: EMS) => {
  const node = viz.node('D');
  return harden({
    withdraw(
      from: 'U',
      amount: bigint,
      chain: Chain,
      metamask: Metamask,
      notify: (label: string) => void,
    ) {
      node.call(from, `withdraw(${amount} USDC, ${chain.name})`);
      node.consequence('D', 'allocate nonce543');
      metamask.sign('D', amount, chain.chainId, () => {
        node.consequence('MM', 'signature');
        notify('stand by...');
        ems.submit(
          'D',
          amount,
          chain.chainId,
          flow => {
            node.consequence('EMH', flow);
            notify('dashboard');
          },
          () => {
            node.consequence('YC', 'flow2 done');
            notify('withdrawal complete');
          },
        );
      });
    },
  });
};

type UI = ReturnType<typeof makeUI>;

const makeUser = (viz: Recorder, ui: UI) => {
  const node = viz.node('U');
  const metamask = makeMetamask(viz, (label, approve) => {
    node.consequence('MM', label);
    approve();
  });
  return harden({
    withdraw(amount: bigint, chain: Chain) {
      ui.withdraw('U', amount, chain, metamask, label =>
        node.consequence('D', label),
      );
    },
  });
};

const simulateEvmWithdrawal = (
  viz: Recorder,
  ymax: YmaxContract,
  chain: Chain,
) => {
  const emh = makeEMH(viz, ymax);
  const ems = makeEMS(viz, emh);
  const ui = makeUI(viz, ems);
  const user = makeUser(viz, ui);

  user.withdraw(500n, chain);

  return harden({ arrows: viz.snapshot(), transfers: ymax.transfers() });
};

/** Markdown parsing */
const md = {
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

/** Mermaid parsing */
const mmd = {
  extractArrows(
    lines: readonly string[],
    nodePattern: RegExp = /\w+/,
  ): readonly Arrow[] {
    const arrowPattern = new RegExp(
      `^\\s*(?<from>${nodePattern.source})\\s*(?<kind>--?>>)\\s*(?<to>${nodePattern.source})\\s*:\\s*(?<label>.*?)\\s*$`,
    );
    return harden(
      lines.flatMap(line => {
        const groups = line.match(arrowPattern)?.groups;
        if (!groups) return [];
        const { from, kind, to, label } = groups;
        return [harden({ from, kind, to, label }) as Arrow];
      }),
    );
  },
};

const withoutLabels = ({ from, kind, to }: Arrow) => harden({ from, kind, to });

const parseTransfer = ({ label }: Arrow) => {
  const match = label.match(/^(@\w+)\.transfer\((\d+),\s*`([+-]\w+)`\)$/);
  if (!match) throw Error('remote-account transfer arrow is malformed');
  const [, source, amount, destination] = match;
  return harden({ source, amount: BigInt(amount), destination });
};

test('EVM withdrawal topology and transfers match diagram', async t => {
  const text = await readFile(evmDesignDoc, 'utf8');
  const section = md.skipToH(3, 'Withdraw (EVM)')(text.split('\n'));
  const diagram = md.eachFence('mermaid', section).next().value;
  if (!diagram) throw Error('Withdraw (EVM) Mermaid block not found');
  const documented = mmd.extractArrows(diagram);

  const viz = makeSequenceRecorder();
  const chain = harden({ name: 'Arbitrum', chainId: 42161 } as const);
  const ymax = makeYmaxContract(viz);
  ymax.setupAccount(chain);
  const simulated = simulateEvmWithdrawal(viz, ymax, chain);

  t.deepEqual(
    documented.map(withoutLabels),
    simulated.arrows.map(withoutLabels),
    'message participants and ordering',
  );

  t.deepEqual(
    documented
      .filter(({ label }) => label.includes('.transfer('))
      .map(parseTransfer),
    simulated.transfers,
    'withdrawal transfer semantics',
  );

  // other labels to be checked as modeling demands increase
});
