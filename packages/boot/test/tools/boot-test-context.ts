import {
  type AgoricNamesRemotes,
  makeAgoricNamesRemotesFromFakeStorage,
} from '@agoric/vats/tools/board-utils.js';
import { Fail } from '@endo/errors';

import type { ExecutionContext } from 'ava';

import {
  type GovernanceDriver,
  type SmartWalletDriver,
  type WalletFactoryDriver,
  makeGovernanceDriver,
  makeWalletFactoryDriver,
} from '../../tools/drivers.js';
import { makeLiquidationTestKit } from '../../tools/liquidation.js';
import {
  fetchCoreEvalRelease,
  makeSwingsetTestKit,
  type MakeSwingsetTestKitOptions,
  type SwingsetTestKit,
} from '../../tools/supports.js';
import {
  loadOrCreateRunUtilsFixture,
  type RunUtilsFixtureName,
} from './runutils-fixtures.js';

type LoggerLike = Pick<ExecutionContext, 'log'> | ((...args: any[]) => void);

type ProposalStep = {
  builderPath: string;
  args?: string[];
  label?: string;
  refreshAgoricNames?: boolean;
};

type ApplyProposalOptions = Pick<ProposalStep, 'label' | 'refreshAgoricNames'>;

type TestLike = Pick<ExecutionContext, 'deepEqual' | 'is' | 'like' | 'true'>;

export type TestWalletDriver = SmartWalletDriver & {
  current: () => ReturnType<SmartWalletDriver['getCurrentWalletRecord']>;
  latest: () => ReturnType<SmartWalletDriver['getLatestUpdateRecord']>;
  expectStatus: (
    t: TestLike,
    partial: Record<string, unknown>,
    message?: string,
  ) => ReturnType<SmartWalletDriver['getLatestUpdateRecord']>;
  expectResult: (
    t: TestLike,
    offerId: string,
    result?: unknown,
    message?: string,
  ) => unknown;
  expectInvitationPath: (
    t: TestLike,
    offerId: string,
    path: unknown,
    message?: string,
  ) => unknown;
};

export type TestWalletFactoryDriver = Omit<
  WalletFactoryDriver,
  'provideSmartWallet'
> & {
  provideSmartWallet: (
    walletAddress: string,
    myMarshaller?: Parameters<WalletFactoryDriver['provideSmartWallet']>[1],
  ) => Promise<TestWalletDriver>;
};

type BootContextHelpers = {
  applyProposal: (
    builderPath: string,
    args?: string[],
    opts?: ApplyProposalOptions,
  ) => Promise<Awaited<ReturnType<SwingsetTestKit['buildProposal']>>>;
  applyProposals: (
    steps: ProposalStep[],
  ) => Promise<Awaited<ReturnType<SwingsetTestKit['buildProposal']>>[]>;
  expectPublished: (
    t: Pick<ExecutionContext, 'deepEqual'>,
    path: string,
    expected: unknown,
  ) => unknown;
  makePublishedLog: (path: string) => {
    read: () => any[];
    reset: () => void;
    expect: (
      t: Pick<ExecutionContext, 'deepEqual'>,
      values: unknown[],
    ) => unknown;
  };
};

export type BootTestContext = SwingsetTestKit & BootContextHelpers;

export type WalletFactoryBootTestContext = BootTestContext & {
  agoricNamesRemotes: AgoricNamesRemotes;
  refreshAgoricNamesRemotes: () => AgoricNamesRemotes;
  evalReleasedProposal: (release: string, name: string) => Promise<void>;
  provideSmartWallet: TestWalletFactoryDriver['provideSmartWallet'];
  walletFactoryDriver: TestWalletFactoryDriver;
};

export type GovernanceBootTestContext = WalletFactoryBootTestContext & {
  governanceDriver: GovernanceDriver;
  expectProposalAccepted: (
    t: TestLike,
    member: GovernanceDriver['ecMembers'][number],
    questionId: string,
  ) => unknown;
  expectVoteAccepted: (
    t: TestLike,
    members: GovernanceDriver['ecMembers'][number][],
    voteId: string,
  ) => unknown;
  expectParamValue: (
    t: Pick<ExecutionContext, 'deepEqual'>,
    key: string,
    expected: unknown,
    valuePath?: (string | number)[],
  ) => unknown;
};

const NO_EXPECTED_RESULT = Symbol('no-expected-result');

const getLog = (input: LoggerLike) =>
  typeof input === 'function' ? input : input.log.bind(input);

const normalizePublishedPath = (path: string) =>
  path.startsWith('published.') ? path : `published.${path}`;

const toPublishedSubpath = (path: string) =>
  normalizePublishedPath(path).replace(/^published\./, '');

const readPublishedLogValues = (
  storage: BootTestContext['storage'],
  path: string,
) => {
  const raw = storage.data.get(normalizePublishedPath(path));
  if (!raw) {
    return [];
  }
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : parsed.values || [];
};

const assertResultPresent = (
  t: Pick<ExecutionContext, 'true'>,
  record: ReturnType<SmartWalletDriver['getLatestUpdateRecord']>,
  offerId: string,
) => {
  t.true(
    record.updated === 'offerStatus' && 'result' in record.status,
    `Expected offer ${offerId} to have a result`,
  );
  if (record.updated !== 'offerStatus' || !('result' in record.status)) {
    throw Fail`offer ${offerId} did not produce a result`;
  }
  return record.status.result;
};

export const enhanceSmartWalletDriver = (
  wallet: SmartWalletDriver,
): TestWalletDriver => ({
  ...wallet,
  current: () => wallet.getCurrentWalletRecord(),
  latest: () => wallet.getLatestUpdateRecord(),
  expectStatus: (t, partial, message) => {
    const latest = wallet.getLatestUpdateRecord();
    t.like(latest, { status: partial }, message);
    return latest;
  },
  expectResult: (t, offerId, result = NO_EXPECTED_RESULT, message) => {
    const latest = wallet.getLatestUpdateRecord();
    t.like(
      latest,
      {
        updated: 'offerStatus',
        status: {
          id: offerId,
          numWantsSatisfied: 1,
        },
      },
      message,
    );
    const actual = assertResultPresent(t, latest, offerId);
    if (result !== NO_EXPECTED_RESULT) {
      t.is(actual, result, message);
    }
    return actual;
  },
  expectInvitationPath: (t, offerId, path, message) => {
    const current = wallet.getCurrentWalletRecord();
    const paths = Object.fromEntries(
      current.offerToPublicSubscriberPaths || [],
    );
    t.deepEqual(paths[offerId], path, message);
    return paths[offerId];
  },
});

export const attachBootContextHelpers = <T extends SwingsetTestKit>(
  ctx: T,
  afterProposal?: () => void | Promise<void>,
): T & BootContextHelpers => {
  const applyProposal = async (
    builderPath: string,
    args: string[] = [],
    opts: ApplyProposalOptions = {},
  ) => {
    const materials = await ctx.buildProposal(builderPath, args);
    try {
      await ctx.evalProposal(materials);
    } finally {
      if (opts.refreshAgoricNames ?? false) {
        await afterProposal?.();
      }
    }
    return materials;
  };

  return {
    ...ctx,
    applyProposal,
    applyProposals: async steps => {
      const materials = [];
      for (const {
        builderPath,
        args = [],
        label,
        refreshAgoricNames,
      } of steps) {
        materials.push(
          await applyProposal(builderPath, args, {
            label,
            refreshAgoricNames,
          }),
        );
      }
      return materials;
    },
    expectPublished: (t, path, expected) =>
      t.deepEqual(ctx.readPublished(toPublishedSubpath(path)), expected),
    makePublishedLog: path => ({
      read: () => readPublishedLogValues(ctx.storage, path),
      reset: () => {
        ctx.storage.data.delete(normalizePublishedPath(path));
      },
      expect: (t, values) =>
        t.deepEqual(readPublishedLogValues(ctx.storage, path), values),
    }),
  };
};

export const makeBootTestContext = async (
  tOrLog: LoggerLike,
  {
    bundleDir,
    fixtureName,
    snapshot,
    ...options
  }: MakeSwingsetTestKitOptions & {
    bundleDir?: string;
    fixtureName?: RunUtilsFixtureName;
  } = {},
): Promise<BootTestContext> => {
  const log = getLog(tOrLog);
  const resolvedSnapshot =
    fixtureName && fixtureName.length > 0
      ? await loadOrCreateRunUtilsFixture(fixtureName, log)
      : snapshot;
  const ctx = await makeSwingsetTestKit(log, bundleDir, {
    ...options,
    snapshot: resolvedSnapshot,
  });
  return attachBootContextHelpers(ctx);
};

export const withWalletFactory = async <T extends BootTestContext>(
  ctx: T,
): Promise<T & WalletFactoryBootTestContext> => {
  const { EV } = ctx.runUtils;
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');

  const agoricNamesRemotes: AgoricNamesRemotes =
    makeAgoricNamesRemotesFromFakeStorage(ctx.storage);
  const refreshAgoricNamesRemotes = () => {
    Object.assign(
      agoricNamesRemotes,
      makeAgoricNamesRemotesFromFakeStorage(ctx.storage),
    );
    return agoricNamesRemotes;
  };

  agoricNamesRemotes.brand.ATOM || Fail`ATOM missing from agoricNames`;

  const baseDriver = await makeWalletFactoryDriver(
    ctx.runUtils,
    ctx.storage,
    agoricNamesRemotes,
  );
  const walletFactoryDriver: TestWalletFactoryDriver = {
    ...baseDriver,
    provideSmartWallet: async (walletAddress, myMarshaller) =>
      enhanceSmartWalletDriver(
        await baseDriver.provideSmartWallet(walletAddress, myMarshaller),
      ),
  };

  const walletCtx = attachBootContextHelpers(ctx, refreshAgoricNamesRemotes);

  const evalReleasedProposal = async (release: string, name: string) => {
    const materials = await fetchCoreEvalRelease({
      repo: 'Agoric/agoric-sdk',
      release,
      name,
    });
    await ctx.evalProposal(materials);
    refreshAgoricNamesRemotes();
  };

  const applyProposal: WalletFactoryBootTestContext['applyProposal'] = async (
    builderPath,
    args = [],
    opts = {},
  ) =>
    walletCtx.applyProposal(builderPath, args, {
      ...opts,
      refreshAgoricNames: opts.refreshAgoricNames ?? true,
    });

  const applyProposals: WalletFactoryBootTestContext['applyProposals'] =
    async steps => {
      const materials = [];
      for (const {
        builderPath,
        args = [],
        label,
        refreshAgoricNames,
      } of steps) {
        materials.push(
          await applyProposal(builderPath, args, {
            label,
            refreshAgoricNames,
          }),
        );
      }
      return materials;
    };

  return {
    ...walletCtx,
    applyProposal,
    applyProposals,
    agoricNamesRemotes,
    refreshAgoricNamesRemotes,
    evalReleasedProposal,
    provideSmartWallet: walletFactoryDriver.provideSmartWallet,
    walletFactoryDriver,
  };
};

export const withGovernance = async <T extends WalletFactoryBootTestContext>(
  ctx: T,
  { wallets }: { wallets: string[] },
): Promise<T & GovernanceBootTestContext> => {
  const governanceDriver = await makeGovernanceDriver(
    ctx,
    ctx.agoricNamesRemotes,
    ctx.walletFactoryDriver,
    wallets,
  );

  const expectProposalAccepted = (
    t: TestLike,
    member: GovernanceDriver['ecMembers'][number],
    questionId: string,
  ) => member.expectStatus(t, { id: questionId, numWantsSatisfied: 1 });

  const expectVoteAccepted = (
    t: TestLike,
    members: GovernanceDriver['ecMembers'][number][],
    voteId: string,
  ) =>
    members.map(member =>
      member.expectStatus(t, { id: voteId, numWantsSatisfied: 1 }),
    );

  const expectParamValue = (
    t: Pick<ExecutionContext, 'deepEqual'>,
    key: string,
    expected: unknown,
    valuePath: (string | number)[] = [],
  ) => {
    const actual = valuePath.reduce(
      (value, segment) => value?.[segment],
      ctx.readPublished(toPublishedSubpath(key)),
    );
    return t.deepEqual(actual, expected);
  };

  return {
    ...ctx,
    governanceDriver,
    expectProposalAccepted,
    expectVoteAccepted,
    expectParamValue,
  };
};

export const withLiquidation = async <
  T extends WalletFactoryBootTestContext & {
    governanceDriver: GovernanceDriver;
  },
>(
  ctx: T,
  { t }: { t: ExecutionContext },
) => {
  const liquidation = await makeLiquidationTestKit({
    swingsetTestKit: ctx,
    agoricNamesRemotes: ctx.agoricNamesRemotes,
    walletFactoryDriver: ctx.walletFactoryDriver,
    governanceDriver: ctx.governanceDriver,
    t,
  });
  return {
    ...ctx,
    ...liquidation,
  };
};
