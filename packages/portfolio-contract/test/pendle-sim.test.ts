/**
 * @file Minimal Pendle sim.
 *
 * This test is a simulation at the same level of abstraction as a Mermaid
 * sequence diagram.
 *
 * Concretely:
 * - each diagram arrow is represented as a method call on the receiving actor
 *   object
 * - the sending actor records the arrow before making that call
 * - each actor may only state facts it already knows from prior messages or
 *   from its own local derivation; downstream helpers must not smuggle in
 *   scenario-specific constants that belong to upstream actors
 * - `viz.start()` records an initiating `->>` arrow
 * - `viz.cont()` records a consequential `-->>` arrow
 * - `viz.think()` records a self-arrow used for local state assignment
 * - `viz.name()` / `viz.label()` let the sim give stable short names to values
 *   that would otherwise be repeated noisily in later arrows
 *
 * The sequence diagram and the sim can be derived from each other: we can
 * start from the diagram and write the sim, or start from the sim and read off
 * the diagram.
 *
 * The snapshot is the Mermaid-style line sequence that this sim produces.
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

type Viz = ReturnType<typeof makeSequenceDiagram>;

const props = (ps: Record<string, string>) =>
  `{ ${Object.entries(ps)
    .map(([p, v]) => `${p}: ${v}`)
    .join(', ')} }`;

const formatAllocations = (
  allocations: Array<{ instrument: string; portion: bigint }>,
) =>
  `{ ${allocations
    .map(({ instrument, portion }) => `${instrument}: ${portion}`)
    .join(', ')} }`;

const targetAllocationToAllocations = (
  targetAllocation: Record<string, string>,
) =>
  Object.entries(targetAllocation).map(([instrument, portion]) => ({
    instrument,
    portion: BigInt(portion.replace(/%$/, '')),
  }));

/**
 * Tiny recorder for Mermaid-like sequence-diagram lines.
 *
 * The intent of this helper is not generic visualization. It exists so a sim
 * test and a sequence diagram can mirror each other:
 * - sender methods record arrows before calling receiver methods
 * - actor methods only record facts available at that point in the flow
 * - the accumulated arrows are snapshotted
 * - the snapshot is reviewed like a lightweight Mermaid diagram
 */
const makeSequenceDiagram = () => {
  const arrows: string[] = [];
  const names = new Map<string, string>();
  return harden({
    name(id: string, label: string) {
      names.set(id, label);
    },
    label(id: string) {
      return names.get(id) ?? id;
    },
    start(from: string, to: string, label: string) {
      arrows.push(`${names.get(from) ?? from}->>${names.get(to) ?? to}: ${label}`);
    },
    cont(from: string, to: string, label: string) {
      arrows.push(
        `${names.get(from) ?? from}-->>${names.get(to) ?? to}: ${label}`,
      );
    },
    think(actor: string, label: string) {
      arrows.push(
        `${names.get(actor) ?? actor}-->>${names.get(actor) ?? actor}: ${label}`,
      );
    },
    lines() {
      return harden([...arrows]);
    },
  });
};

const makeUI = (
  viz: Viz,
  emsIn: ReturnType<typeof makeEMSIngress>,
  portfolio: string,
) =>
  harden({
    // XXX choose whether this sim should model `TargetAllocation` or
    // `readonly EIP712Allocation[]`; this toy shape matches neither exactly yet.
    // XXX Pendle PT selection in the real UI needs instrument metadata that
    // current instruments don't emphasize the same way, especially maturity
    // date and current implied fixed yield.
    async setTargetAllocation(
      targetAllocation: Record<string, string>,
      allocationLabel: string,
    ) {
      viz.cont(
        'ui',
        'evmIn',
        `submitSigned(SetTargetAllocation({ portfolio: ${portfolio}, allocations: ${allocationLabel} }))`,
      );
      // XXX The signed payload uses `allocations: Allocation[]`, not the
      // record shape above. Keep the record here for diagram legibility.
      await emsIn.submitSignedSetTargetAllocation({
        portfolio,
        allocations: targetAllocationToAllocations(targetAllocation),
        allocationLabel,
      });
    },
  });

// `evmIn` = EVM Ingress
const makeEMSIngress = (
  viz: Viz,
  portfolio: ReturnType<typeof makePortfolio>,
) =>
  harden({
    async submitSignedSetTargetAllocation(args: {
      portfolio: string;
      allocations: Array<{ instrument: string; portion: bigint }>;
      allocationLabel: string;
    }) {
      viz.cont(
        'evmIn',
        'portfolio',
        `rebalance(${args.allocationLabel})`,
      );
      await portfolio.rebalance(args.allocations, args.allocationLabel);
    },
  });

const makePlanner = (viz: Viz) =>
  harden({
    async requestPlan(_flowDetail: string) {
      viz.think('planner', 'plan1 = [...]');
      return 'plan1';
    },
  });

const makeRemoteAccount = (
  chainName: string,
  portfolioId: string,
) =>
  harden({
    async multicall(_calls: string) {},
    getChainName() {
      return chainName;
    },
    getPortfolioId() {
      return portfolioId;
    },
  });

const makePortfolio = (
  viz: Viz,
  planner: ReturnType<typeof makePlanner>,
  remoteAccount: ReturnType<typeof makeRemoteAccount>,
) =>
  harden({
    async rebalance(
      _allocations: Array<{ instrument: string; portion: bigint }>,
      allocationLabel: string,
    ) {
      viz.think(
        'portfolio',
        `setTargetAllocation(${allocationLabel}) // publish to vstorage`,
      );
      viz.think(
        'portfolio',
        'detail = { type: rebalance }',
      );
      viz.cont('portfolio', 'planner', 'requestPlan({ flow43: detail })');
      const plan1 = await planner.requestPlan('{ flow43: detail }');
      viz.cont('planner', 'portfolio', `resolvePlan(${plan1})`);
      viz.think(
        'portfolio',
        'calls = [approve(USDC), swapExactTokenForPt(...)]',
      );
      viz.cont(
        'portfolio',
        `at${remoteAccount.getChainName()}`,
        `multicall(calls)`,
      );
      await remoteAccount.multicall('calls');
    },
  });

const makeTrader = (viz: Viz) =>
  harden({
    async beginPendleJourney(ui: ReturnType<typeof makeUI>) {
      const allocationId = 'allocPendle30';
      const targetAllocation = {
        'Pendle PT-aUSDC - Arbitrum': '30%',
        Aave_Arbitrum: '70%',
      };
      viz.name(allocationId, 'pendle30');
      viz.think(
        'trader',
        `${viz.label(allocationId)} = ${props(targetAllocation)}`,
      );
      viz.start(
        'trader',
        'ui',
        `setTargetAllocation(${viz.label(allocationId)})`,
      );
      await ui.setTargetAllocation(targetAllocation, viz.label(allocationId));
    },
  });

test('Pendle sim draft: trader allocates to Pendle PT in UI', async t => {
  const viz = makeSequenceDiagram();

  const planner = makePlanner(viz);
  const remoteAccount = makeRemoteAccount('Arbitrum', '123');
  const portfolio = makePortfolio(viz, planner, remoteAccount);
  const emsIn = makeEMSIngress(viz, portfolio);
  const ui = makeUI(viz, emsIn, '123');
  const trader = makeTrader(viz);
  await trader.beginPendleJourney(ui);

  // Snapshot the Mermaid-like arrow list that this executable sim produced.
  t.snapshot(viz.lines());
});
