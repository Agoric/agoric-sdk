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

type SequenceViz = ReturnType<typeof makeSequenceDiagram>;
type ActorViz = ReturnType<SequenceViz['as']>;
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
  impliedApy: string;
  exitValue: { brand: 'USDC'; value: bigint };
};
type PositionLabel = string;
type EventLabel = string;

type YmaxDataService = ReturnType<typeof makeYmaxDataService>;
type EMSIngress = ReturnType<typeof makeEMSIngress>;
type Planner = ReturnType<typeof makePlanner>;
type MaturityService = ReturnType<typeof makeMaturityService>;
type Vstorage = ReturnType<typeof makeVstorage>;
type NotificationService = ReturnType<typeof makeNotificationService>;
type Portfolio = ReturnType<typeof makePortfolio>;
type UI = ReturnType<typeof makeUI>;
type Trader = ReturnType<typeof makeTrader>;

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
      return emsIn.submitSignedSetTargetAllocation({
        portfolio: portfolioId,
        targetAllocation,
      });
    },
    async refreshPortfolio() {
      viz.cont('yds', 'getPortfolioDetail(123)');
      const position1 = await yds.getPortfolioDetail(portfolioId);
      viz.returnedFrom('yds', viz.label(position1));
      return position1;
    },
    async openActivityFeed() {
      viz.cont('yds', 'getNotifications(123)');
      const notice1 = await yds.getNotifications(portfolioId);
      viz.returnedFrom('yds', viz.label(notice1));
      return notice1;
    },
  });

// `evmIn` = EVM Ingress
const makeEMSIngress = (viz: ActorViz, portfolio: Portfolio) =>
  harden({
    async submitSignedSetTargetAllocation(args: SetTargetAllocationArgs) {
      viz.cont('portfolio', `rebalance(${viz.label(args.targetAllocation)})`);
      return portfolio.rebalance(args.targetAllocation);
    },
  });

const makePlanner = (viz: ActorViz, _vstorage: Vstorage) =>
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
    async detectMaturity(positionLabel: string) {
      // FIXME labels-vs-values: return a structured redemption plan value, not 'redeemPlan1'.
      viz.think('redeemPlan1 = [redeemPyToToken(...)]');
      viz.cont('portfolio', 'resolvePlan(redeemPlan1)');
      return 'redeemPlan1';
    },
  });

const makeMaturityService = (viz: ActorViz) =>
  harden({
    async detectMatured(planner: Planner, positionLabel: string) {
      viz.cont('planner', `detectMatured(${positionLabel})`);
      return planner.detectMaturity(positionLabel);
    },
    async redeemMaturedPosition(portfolio: Portfolio, positionLabel: string) {
      viz.start('portfolio', `redeemMaturedPosition(${positionLabel})`);
      await portfolio.redeemMaturedPosition(positionLabel);
    },
  });

const makeVstorage = (viz: ActorViz, yds: YmaxDataService) =>
  harden({
    /**
     * Simulates updating the portfolio status cell at
     * `published.<instance>.portfolios.portfolio${portfolioId}` with a new
     * `targetAllocation` field.
     */
    async publishTargetAllocation(
      portfolioId: PortfolioId,
      targetAllocation: TargetAllocationPt,
    ) {
      viz.cont('yds', `ingest(${viz.label(targetAllocation)})`);
      await yds.ingestPublishedState(viz.label(targetAllocation));
    },
    /**
     * Simulates updating published position state at
     * `published.<instance>.portfolios.${portfolioId}.positions.${positionKey}`.
     */
    async publishPendlePosition(
      portfolioId: PortfolioId,
      positionKey: string,
      positionLabel: string,
    ) {
      viz.cont('yds', `ingest(${positionLabel})`);
      await yds.ingestPublishedState(positionLabel);
    },
    /**
     * Simulates updating published flow/lifecycle state at
     * `published.<instance>.portfolios.${portfolioId}.flows.${flowKey}`.
     */
    async publishLifecycle(
      portfolioId: PortfolioId,
      flowKey: `flow${bigint}`,
      eventLabel: string,
    ) {
      viz.cont('yds', `ingest(${eventLabel})`);
      await yds.ingestPublishedState(eventLabel);
    },
  });

const makeYmaxDataService = (viz: ActorViz) =>
  harden({
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
      const catalog = [
        {
          instrument: 'Pendle PT-aUSDC - Arbitrum',
          maturity: '2025-12-25',
          impliedApy: '5.2%',
          market: '0xPendleMarket',
        },
      ] as const satisfies InstrumentCatalog;
      viz.name(catalog, 'catalog1');
      viz.think(`${viz.label(catalog)} = ${canon(catalog)}`);
      return catalog;
    },
    async ingestPublishedState(_stateLabel: string) {},
    async getPortfolioDetail(_portfolioId: string) {
      const positionView = {
        instrument: 'Pendle PT-aUSDC - Arbitrum',
        maturity: '2025-12-25',
        impliedApy: '5.2%',
        exitValue: { brand: 'USDC', value: 104n },
      } as const satisfies EnrichedPendlePositionView;
      viz.name(positionView, 'positionView1');
      viz.think(`${viz.label(positionView)} = ${canon(positionView)}`);
      return positionView;
    },
    async getNotifications(_portfolioId: string) {
      const notice = [
        { kind: 'PendleMatured' },
        { kind: 'PendleRedeemed' },
      ] as const;
      viz.name(notice, 'notice1');
      viz.think(`${viz.label(notice)} = ${canon(notice)}`);
      return notice;
    },
    async fanoutNotification(
      notify: NotificationService,
      eventLabel: EventLabel,
    ) {
      viz.cont('notify', `fanout(${eventLabel})`);
      await notify.fanout(eventLabel);
    },
  });

const makeNotificationService = (viz: ActorViz) =>
  harden({
    async fanout(eventLabel: string) {
      viz.cont('trader', `push(${eventLabel})`);
    },
  });

const makeRemoteAccount = (
  viz: ActorViz,
  chainName: string,
  portfolioId: string,
) =>
  harden({
    async multicall(_calls: CallBatch) {
      viz.think('note over atArbitrum: settled by resolver/watcher');
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
  remoteAccount: ReturnType<typeof makeRemoteAccount>,
  planner: Planner,
  maturitySvc: MaturityService,
  vstorage: Vstorage,
  yds: YmaxDataService,
  notify: NotificationService,
) =>
  harden({
    async rebalance(targetAllocation: TargetAllocationPt) {
      viz.think(`setTargetAllocation(${viz.label(targetAllocation)})`);
      viz.cont(
        'vstorage',
        `publishTargetAllocation(${portfolioId}, ${viz.label(targetAllocation)})`,
      );
      await vstorage.publishTargetAllocation(portfolioId, targetAllocation);
      const flowKey = 'flow43';
      const detail: FlowDetail = { type: 'rebalance' };
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
      await vstorage.publishPendlePosition(
        portfolioId as `portfolio${bigint}`,
        positionKey,
        viz.label(position1),
      );
      // FIXME labels-vs-values: model lifecycle events as values, not names like 'eventBought1'.
      viz.cont(
        'vstorage',
        `publishLifecycle(${portfolioId}.flows.${flowKey}, eventBought1)`,
      );
      await vstorage.publishLifecycle(
        portfolioId as `portfolio${bigint}`,
        flowKey,
        'eventBought1',
      );
      await yds.fanoutNotification(notify, 'eventBought1');
    },
    async redeemMaturedPosition(positionLabel: string) {
      const positionKey = 'Pendle_PT_aUSDC_Arbitrum';
      const flowKey = 'flow43';
      const redeemPlan1 = await maturitySvc.detectMatured(
        planner,
        positionLabel,
      );
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
      await vstorage.publishPendlePosition(
        portfolioId as `portfolio${bigint}`,
        positionKey,
        viz.label(position1),
      );
      // FIXME labels-vs-values: model lifecycle events as values, not names like 'eventRedeemed1'.
      viz.cont(
        'vstorage',
        `publishLifecycle(${portfolioId}.flows.${flowKey}, eventRedeemed1)`,
      );
      await vstorage.publishLifecycle(
        portfolioId as `portfolio${bigint}`,
        flowKey,
        'eventRedeemed1',
      );
      await yds.fanoutNotification(notify, 'eventRedeemed1');
    },
  });

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
      return ui.setTargetAllocation(targetAllocation);
    },
    async reviewPortfolio() {
      const positionView1 = await ui.refreshPortfolio();
      viz.returnedFrom('ui', viz.label(positionView1));
    },
    async reviewUpdates() {
      const positionView1 = await ui.refreshPortfolio();
      viz.returnedFrom('ui', viz.label(positionView1));
      const notice1 = await ui.openActivityFeed();
      viz.returnedFrom('ui', viz.label(notice1));
    },
  });

test('Pendle sim draft: zoomed-out Pendle journey across planner, execution, publishing, and maturity', async t => {
  const viz = makeSequenceDiagram();

  const yds = makeYmaxDataService(viz.as('yds'));
  const vstorage = makeVstorage(viz.as('vstorage'), yds);
  const notify = makeNotificationService(viz.as('notify'));
  const planner = makePlanner(viz.as('planner'), vstorage);
  const maturitySvc = makeMaturityService(viz.as('maturitySvc'));
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
    maturitySvc,
    vstorage,
    yds,
    notify,
  );
  const emsIn = makeEMSIngress(viz.as('evmIn'), portfolio);
  const ui = makeUI(viz.as('ui'), emsIn, yds, 'portfolio123');
  const trader = makeTrader(viz.as('trader'), ui);

  await trader.discoverPendle();
  t.snapshot(viz.snapshot(), 'discoverPendle');

  await trader.submitPendleAllocation();
  t.snapshot(viz.snapshot(), 'submitPendleAllocation');

  await maturitySvc.redeemMaturedPosition(portfolio, 'position1');
  t.snapshot(viz.snapshot(), 'redeemMaturedPosition');

  await trader.reviewUpdates();
  t.snapshot(viz.snapshot(), 'reviewUpdates');
});
