/**
 * @file Minimal Pendle sim.
 *
 * This test is a simulation at the same level of abstraction as a Mermaid
 * sequence diagram.
 *
 * Concretely:
 * - each diagram arrow is represented as a method call on the receiving actor
 *   object, except return arrows
 * - the sending actor records the arrow before making that call
 * - each actor may only state facts it already knows from prior messages or
 *   from its own local derivation; downstream helpers must not smuggle in
 *   scenario-specific constants that belong to upstream actors
 * - return arrows are modeled as ordinary JS return values rather than method
 *   calls; if helpful, a returned value may be given a short `viz.name()`
 *   alias before it is returned, and the caller may record a return arrow once
 *   it has the value in hand
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
import type {
  FlowDetail,
  InstrumentId,
  MovementDesc,
  TargetAllocation,
} from '@agoric/portfolio-api';

type SequenceDiagram = ReturnType<typeof makeSequenceDiagram>;
type ActorViz = ReturnType<SequenceDiagram['as']>;
type Vstorage = ReturnType<typeof makeVstorage>;
type EMSIngress = ReturnType<typeof makeEMSIngress>;
type YmaxDataService = ReturnType<typeof makeYmaxDataService>;
type Portfolio = ReturnType<typeof makePortfolio>;
type RemoteAccount = ReturnType<typeof makeRemoteAccount>;
type Planner = ReturnType<typeof makePlanner>;
type UI = ReturnType<typeof makeUI>;
type Allocation = { instrument: string; portion: bigint };
type PortfolioId = `portfolio${bigint}`;
type PendleInstrumentId = 'Pendle PT-aUSDC - Arbitrum';
type InstrumentIdPt = InstrumentId | PendleInstrumentId;
type TargetAllocationPt = Partial<Record<InstrumentIdPt, bigint>>;
type CallBatch = readonly string[];
type SetTargetAllocationArgs = {
  portfolio: PortfolioId;
  targetAllocation: TargetAllocationPt;
};
type InstrumentCatalog = readonly [
  {
    instrument: PendleInstrumentId;
    maturity: string;
    impliedApy: string;
    market: string;
  },
];
type PublishedPendlePosition = {
  protocol: 'pendle';
  accountId: `eip155:42161:0x${string}`;
  totalIn: { brand: 'USDC'; value: bigint };
  totalOut: { brand: 'USDC'; value: bigint };
};
type EnrichedPendlePositionView = {
  instrument: PendleInstrumentId;
  maturity: string;
  matured: boolean;
  impliedApy: string;
  exitValue: { brand: 'USDC'; value: bigint };
};
type PositionLabel = string;
type FlowTerminalState = 'done';
type VstorageInstance = 'ymax0' | 'ymax1';
type VstoragePath =
  | `published.${VstorageInstance}.portfolios.${PortfolioId}`
  | `published.${VstorageInstance}.portfolios.${PortfolioId}.positions.${string}`
  | `published.${VstorageInstance}.portfolios.${PortfolioId}.flows.${`flow${bigint}`}`;
type VstoragePrefix =
  | `published.${VstorageInstance}.portfolios.${PortfolioId}.positions.`
  | `published.${VstorageInstance}.portfolios.${PortfolioId}.flows.`;

const props = (ps: Record<string, string>) =>
  `{ ${Object.entries(ps)
    .map(([p, v]) => `${p}: ${v}`)
    .join(', ')} }`;

const bigIntReplacer = (_key: string, value: unknown) =>
  typeof value === 'bigint' ? `${value}n` : value;

const canon = (value: unknown) =>
  value && typeof value === 'object'
    ? JSON.stringify(value, bigIntReplacer)
    : String(value);

const nextTurn = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/**
 * Tiny recorder for Mermaid-like sequence-diagram lines.
 *
 * The intent of this helper is not generic visualization. It exists so a sim
 * test and a sequence diagram can mirror each other:
 * - sender methods record arrows before calling receiver methods
 * - actor methods only record facts available at that point in the flow
 * - the accumulated arrows are snapshotted and then cleared so the same actor
 *   graph can produce multiple diagram slices
 * - the snapshot is reviewed like a lightweight Mermaid diagram
 *
 * TODO consider a thin spy/send wrapper around actor references so message
 * sends can auto-record arrows without giving up explicit control of labels
 * and local `think(...)` steps.
 */
const makeSequenceDiagram = () => {
  const arrows: string[] = [];
  const names = new Map<string, string>();
  const renderName = (id: string) => names.get(id) ?? id;
  return harden({
    name(id: unknown, label: string) {
      names.set(canon(id), label);
    },
    label(id: unknown) {
      return names.get(canon(id)) ?? canon(id);
    },
    as(actor: string) {
      return harden({
        name(id: unknown, label: string) {
          names.set(canon(id), label);
        },
        label(id: unknown) {
          return names.get(canon(id)) ?? canon(id);
        },
        start(to: string, label: string) {
          arrows.push(`${renderName(actor)}->>${renderName(to)}: ${label}`);
        },
        cont(to: string, label: string) {
          arrows.push(`${renderName(actor)}-->>${renderName(to)}: ${label}`);
        },
        returnedFrom(from: string, label: string) {
          arrows.push(`${renderName(from)}-->>${renderName(actor)}: ${label}`);
        },
        think(label: string) {
          arrows.push(`${renderName(actor)}-->>${renderName(actor)}: ${label}`);
        },
      });
    },
    snapshot() {
      const lines = harden([...arrows]);
      arrows.length = 0;
      return lines;
    },
  });
};

const makeUI = (
  viz: ActorViz,
  emsIn: EMSIngress,
  yds: YmaxDataService,
  portfolioId: PortfolioId,
) =>
  harden({
    // XXX choose whether this sim should model `TargetAllocation` or
    // `readonly EIP712Allocation[]`; this toy shape matches neither exactly yet.
    // XXX Pendle PT selection in the real UI needs instrument metadata that
    // current instruments don't emphasize the same way, especially maturity
    // date and current implied fixed yield.
    async openPendleDiscovery() {
      viz.cont('yds', 'getInstrumentCatalog()');
      const catalog1 = await yds.getInstrumentCatalog();
      viz.returnedFrom('yds', viz.label(catalog1));
      return catalog1;
    },
    async setTargetAllocation(targetAllocation: TargetAllocationPt) {
      viz.cont(
        'evmIn',
        `submitSigned(SetTargetAllocation({ portfolio: ${portfolioId}, allocations: ${viz.label(targetAllocation)} }))`,
      );
      const flowKey = await emsIn.submitSignedSetTargetAllocation({
        portfolio: portfolioId,
        targetAllocation,
      });
      viz.returnedFrom('evmIn', flowKey);
      viz.think(`${flowKey} is in progress`);
      return flowKey;
    },
    async refreshPortfolio() {
      viz.cont('yds', `getPortfolioDetail(${portfolioId})`);
      const position1 = await yds.getPortfolioDetail(portfolioId);
      viz.returnedFrom('yds', viz.label(position1));
      return position1;
    },
  });

// `evmIn` = EVM Ingress
const makeEMSIngress = (
  viz: ActorViz,
  portfolio: Portfolio,
) =>
  harden({
    async submitSignedSetTargetAllocation(args: SetTargetAllocationArgs) {
      viz.cont('portfolio', `rebalance(${viz.label(args.targetAllocation)})`);
      const flowKey = await portfolio.rebalance(args.targetAllocation);
      viz.returnedFrom('portfolio', flowKey);
      return flowKey;
    },
  });

const makePlanner = (
  viz: ActorViz,
  _vstorage: Vstorage,
) =>
  harden({
    async requestPlan(
      _portfolioId: `portfolio${bigint}`,
      _flowDetail: FlowDetail,
    ): Promise<MovementDesc[]> {
      // TODO: visualize getting plan inputs: vstorage, balances
      // const { targetAllocations } =
      //   await vstorage.getPortfolioStatus(portfolioId);

      // TODO: visualize call to pendle API to get quote
      viz.think('quote1 = pendle entry quote + slippage bounds');
      const amount = { brand: 'USDC' as never, value: 100n };
      const plan1 = [
        {
          src: '@Arbitrum',
          dest: 'Pendle PT-aUSDC - Arbitrum' as never,
          amount,
        } as MovementDesc,
      ];
      viz.think(`plan1 = ${canon(plan1)}`);
      viz.name(plan1, 'plan1');
      return plan1;
    },
    async detectMaturity(_positionLabel: string) {
      // FIXME labels-vs-values: return a structured redemption plan value, not 'redeemPlan1'.
      viz.think('redeemPlan1 = [redeemPyToToken(...)]');
      viz.cont('portfolio', 'resolvePlan(redeemPlan1)');
      return 'redeemPlan1';
    },
  });

const makeVstorage = (instance: VstorageInstance) => {
  const entries = new Map<VstoragePath, unknown>();
  const waiters = new Map<VstoragePath, Array<(value: unknown) => void>>();
  const resolveWaiters = (path: VstoragePath, value: unknown) => {
    const callbacks = waiters.get(path);
    if (!callbacks) return;
    waiters.delete(path);
    for (const resolve of callbacks) resolve(value);
  };
  const awaitLatest = (path: VstoragePath) =>
    entries.has(path)
      ? Promise.resolve(entries.get(path))
      : new Promise<unknown>(resolve => {
          const callbacks = waiters.get(path) ?? [];
          callbacks.push(resolve);
          waiters.set(path, callbacks);
        });

  return harden({
    async publish(path: VstoragePath, value: unknown) {
      entries.set(path, value);
      resolveWaiters(path, value);
    },
    async get(path: VstoragePath) {
      return awaitLatest(path);
    },
    async list(prefix: VstoragePrefix) {
      return [...entries.keys()].filter(path => path.startsWith(prefix));
    },
    portfolioPath(portfolioId: PortfolioId) {
      return `published.${instance}.portfolios.${portfolioId}` as const;
    },
    positionPath(portfolioId: PortfolioId, positionKey: string) {
      return `published.${instance}.portfolios.${portfolioId}.positions.${positionKey}` as const;
    },
    flowPrefix(portfolioId: PortfolioId) {
      return `published.${instance}.portfolios.${portfolioId}.flows.` as const;
    },
    flowPath(portfolioId: PortfolioId, flowKey: `flow${bigint}`) {
      return `published.${instance}.portfolios.${portfolioId}.flows.${flowKey}` as const;
    },
  });
};

const makeYmaxDataService = (
  viz: ActorViz,
  vstorage: Vstorage,
  now: () => number,
) => {
  const catalog = [
    {
      instrument: 'Pendle PT-aUSDC - Arbitrum',
      maturity: '2026-09-26',
      impliedApy: '7.2%',
      market: '0xPendleMarket',
    },
  ] as const satisfies InstrumentCatalog;

  return harden({
    /**
     * Simulates the YDS catalog fetch that the web UI performs via
     * `GET /instruments` on the YDS worker.
     *
     * In `ymax-web`, the UI hook calls `useGetInstruments(undefined, ...)`,
     * i.e. no query params by default. The backing route is
     * `GET /instruments?includeAll=<bool>`, where `includeAll` is optional and
     * the default UI path omits it.
     */
    async getInstrumentCatalog() {
      viz.name(catalog, 'catalog1');
      viz.think(`${viz.label(catalog)} = ${canon(catalog)}`);
      return catalog;
    },
    /**
     * Simulates the YDS portfolio-detail fetch performed by the web UI via
     * `GET /portfolios/{portfolioId}`.
     *
     * In `ymax-web`, the UI uses the generated
     * `useGetPortfoliosPortfolioId(portfolioId, ...)` hook for this route.
     */
    async getPortfolioDetail(portfolioId: PortfolioId) {
      const portfolioPath = vstorage.portfolioPath(portfolioId);
      viz.cont('vstorage', `get(${portfolioPath})`);
      const portfolioUpdate = await vstorage.get(portfolioPath);
      viz.returnedFrom('vstorage', viz.label(portfolioUpdate));
      const positionKey = 'Pendle_PT_aUSDC_Arbitrum';
      const positionPath = vstorage.positionPath(portfolioId, positionKey);
      viz.cont('vstorage', `get(${positionPath})`);
      const position1 = (await vstorage.get(
        positionPath,
      )) as PublishedPendlePosition;
      viz.returnedFrom('vstorage', viz.label(position1));
      const [pendleInstrument] = catalog;
      const maturityMs = Date.parse(`${pendleInstrument.maturity}T00:00:00Z`);
      const matured = now() >= maturityMs;
      viz.think(
        `matured = now() >= ${JSON.stringify(pendleInstrument.maturity)}`,
      );
      const exitValue =
        position1.totalOut.value > 0n ? position1.totalOut : position1.totalIn;
      // TODO look for an on-chain tx proving the PT was redeemed once maturity has passed.
      const positionView = {
        instrument: pendleInstrument.instrument,
        maturity: pendleInstrument.maturity,
        matured,
        impliedApy: pendleInstrument.impliedApy,
        exitValue: matured ? exitValue : position1.totalIn,
      } as const satisfies EnrichedPendlePositionView;
      viz.name(positionView, 'positionView1');
      viz.think(`${viz.label(positionView)} = ${canon(positionView)}`);
      return positionView;
    },
  });
};

const makeRemoteAccount = (
  viz: ActorViz,
  chainName: string,
  portfolioId: string,
) =>
  harden({
    async multicall(_calls: CallBatch) {
      viz.think(`note over at${chainName}: settled by resolver/watcher`);
      // TODO: visualize call to @Arbitrum, to pendle contract, etc.
      viz.cont('portfolio', `ack`);
    },
    getChainName() {
      return chainName;
    },
    getPortfolioId() {
      return portfolioId;
    },
  });

const makePortfolio = (
  viz: ActorViz,
  portfolioId: PortfolioId,
  remoteAccount: RemoteAccount,
  planner: Planner,
  vstorage: Vstorage,
) => {
  let pendingSettlement = Promise.resolve();
  return harden({
    async rebalance(targetAllocation: TargetAllocationPt) {
      viz.think(`setTargetAllocation(${viz.label(targetAllocation)})`);
      viz.cont(
        'vstorage',
        `publishTargetAllocation(${portfolioId}, ${viz.label(targetAllocation)})`,
      );
      await vstorage.publish(vstorage.portfolioPath(portfolioId), {
        targetAllocation,
      });
      const flowKey = 'flow43' as const;
      const detail: FlowDetail = { type: 'rebalance' };
      viz.think(`${flowKey} = ${props(detail)}`);
      pendingSettlement = (async () => {
        await nextTurn();
        viz.cont('planner', `requestPlan(${portfolioId}, ${props(detail)})`);
        const plan1 = await planner.requestPlan(portfolioId, detail);
        viz.returnedFrom('planner', viz.label(plan1));
        // TODO: trace swapExactTokenForPt details to their source
        const calls = ['approve(USDC)', 'swapExactTokenForPt(...)'] as const;
        viz.name(calls, 'calls');
        viz.think(`calls = ${canon(calls)}`);
        const positionKey = 'Pendle_PT_aUSDC_Arbitrum';
        viz.cont(
          `at${remoteAccount.getChainName()}`,
          `multicall(${viz.label(calls)})`,
        );
        await remoteAccount.multicall(calls);
        const position1 = {
          protocol: 'pendle',
          accountId: 'eip155:42161:0xabc123',
          totalIn: { brand: 'USDC', value: 100n },
          totalOut: { brand: 'USDC', value: 0n },
        } as const satisfies PublishedPendlePosition;
        viz.name(position1, 'position1');
        viz.think(`${viz.label(position1)} = ${canon(position1)}`);
        viz.cont(
          'vstorage',
          `publishPosition(${portfolioId}.positions.${positionKey}, ${viz.label(position1)})`,
        );
        await vstorage.publish(
          vstorage.positionPath(portfolioId, positionKey),
          position1,
        );
        viz.cont('vstorage', `setFlowStatus(${portfolioId}, ${flowKey}, done)`);
        await vstorage.publish(vstorage.flowPath(portfolioId, flowKey), 'done');
      })();
      return flowKey;
    },
    async whenSettled() {
      await pendingSettlement;
    },
    async redeemMaturedPosition(positionLabel: string) {
      await pendingSettlement;
      const positionKey = 'Pendle_PT_aUSDC_Arbitrum';
      const flowKey = 'flow43';
      viz.cont('planner', `detectMatured(${positionLabel})`);
      const redeemPlan1 = await planner.detectMaturity(positionLabel);
      const redeemCalls = ['redeemPyToToken(...)'] as const;
      viz.name(redeemCalls, 'redeemCalls');
      viz.think(`redeemCalls = ${canon(redeemCalls)}`);
      viz.cont(
        `at${remoteAccount.getChainName()}`,
        `multicall(${viz.label(redeemCalls)})`,
      );
      await remoteAccount.multicall(redeemCalls);
      const position1 = {
        protocol: 'pendle',
        accountId: 'eip155:42161:0xabc123',
        totalIn: { brand: 'USDC', value: 100n },
        totalOut: { brand: 'USDC', value: 104n },
      } as const satisfies PublishedPendlePosition;
      viz.name(position1, 'position1');
      viz.think(`${viz.label(position1)} = ${canon(position1)}`);
      viz.cont(
        'vstorage',
        `publishPosition(${portfolioId}.positions.${positionKey}, ${viz.label(position1)})`,
      );
      await vstorage.publish(
        vstorage.positionPath(portfolioId as `portfolio${bigint}`, positionKey),
        position1,
      );
      viz.cont('vstorage', `setFlowStatus(${portfolioId}, ${flowKey}, done)`);
      await vstorage.publish(
        vstorage.flowPath(portfolioId as `portfolio${bigint}`, flowKey),
        'done',
      );
    },
  });
};

const makeTrader = (viz: ActorViz, ui: UI) =>
  harden({
    async discoverPendle() {
      viz.start('ui', 'openPendleDiscovery()');
      const catalog1 = await ui.openPendleDiscovery();
      viz.returnedFrom('ui', viz.label(catalog1));
    },
    async submitPendleAllocation() {
      const targetAllocation = {
        'Pendle PT-aUSDC - Arbitrum': 30n,
        Aave_Arbitrum: 70n,
      } satisfies TargetAllocationPt;
      viz.name(targetAllocation, 'pendle30');
      viz.think(`${viz.label(targetAllocation)} = ${canon(targetAllocation)}`);
      viz.start('ui', `setTargetAllocation(${viz.label(targetAllocation)})`);
      const flowKey = await ui.setTargetAllocation(targetAllocation);
      viz.returnedFrom('ui', flowKey);
      return flowKey;
    },
    async reviewPortfolio() {
      const positionView1 = await ui.refreshPortfolio();
      viz.returnedFrom('ui', viz.label(positionView1));
    },
    async reviewUpdates() {
      const positionView1 = await ui.refreshPortfolio();
      viz.returnedFrom('ui', viz.label(positionView1));
    },
  });

test('Pendle sim draft: zoomed-out Pendle journey across planner, execution, publishing, and maturity', async t => {
  const viz = makeSequenceDiagram();
  let theTime = Date.parse('2026-08-15T00:00:00Z');

  const vstorage = makeVstorage('ymax1');
  const yds = makeYmaxDataService(viz.as('yds'), vstorage, () => theTime);
  const planner = makePlanner(viz.as('planner'), vstorage);
  // TODO: push makeRemoteAccount down into makePortfolio
  const remoteAccount = makeRemoteAccount(
    viz.as('atArbitrum'),
    'Arbitrum',
    '123',
  );
  const portfolio = makePortfolio(
    viz.as('portfolio'),
    'portfolio123',
    remoteAccount,
    planner,
    vstorage,
  );
  const emsIn = makeEMSIngress(viz.as('evmIn'), portfolio);
  const ui: UI = makeUI(viz.as('ui'), emsIn, yds, 'portfolio123');
  const trader = makeTrader(viz.as('trader'), ui);

  await trader.discoverPendle();
  t.snapshot(viz.snapshot(), 'discoverPendle');

  await trader.submitPendleAllocation();
  await portfolio.whenSettled();
  t.snapshot(viz.snapshot(), 'submitPendleAllocation');

  theTime = Date.parse('2026-09-27T00:00:00Z');

  await trader.reviewUpdates();
  t.snapshot(viz.snapshot(), 'reviewUpdates');
});
