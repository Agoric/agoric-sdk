/**
 * Exercises the economic-committee governance machinery (the
 * {@link makeGovernanceDriver} test kit, composed via {@link withGovernance})
 * against provisionPool — the only committee-governed contract that survives
 * the Inter Protocol removal (#12719). The committee proposes and enacts a
 * change to the `PerAccountInitialAmount` parameter, and we verify the new
 * value is published.
 */
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';
import type { Amount } from '@agoric/ertp';
import { AmountMath } from '@agoric/ertp';
import {
  makeBootTestContext,
  withGovernance,
  withWalletFactory,
  type GovernanceBootTestContext,
} from '../tools/boot-test-context.js';

// Must match the voterAddresses invited by invite-committee.js in the config.
const committeeWallets = [
  'agoric1gx9uu7y6c90rqruhesae2t7c2vlw4uyyxlqxrx',
  'agoric1d4228cvelf8tj65f4h7n2td90sscavln2283h5',
  'agoric14543m33dr28x7qhwc558hzlj9szwhzwzpcmw6a',
  'agoric13p9adwk0na5npfq64g22l6xucvqdmu3xqe70wq',
  'agoric1el6zqs8ggctj5vwyukyk4fh50wcpdpwgugd5l5',
  'agoric1zayxg4e9vd0es9c9jlpt36qtth255txjp6a8yc',
];

const PROVISION_POOL_GOVERNANCE_PATH = 'provisionPool.governance';

const makeTestContext = async (
  t: Parameters<typeof makeBootTestContext>[0],
): Promise<GovernanceBootTestContext> => {
  const base = await makeBootTestContext(t, {
    configSpecifier: '@agoric/vm-config/decentral-main-vaults-config.json',
  });
  const walletCtx = await withWalletFactory(base);
  return withGovernance(walletCtx, { wallets: committeeWallets });
};

const test = anyTest as TestFn<GovernanceBootTestContext>;

test.before(async t => {
  t.context = await makeTestContext(t);
});

test.after.always(t => {
  return t.context.shutdown && t.context.shutdown();
});

test.serial(
  'economic committee changes provisionPool PerAccountInitialAmount',
  async t => {
    const { agoricNamesRemotes, governanceDriver, readPublished } = t.context;

    const provisionPool = agoricNamesRemotes.instance.provisionPool;
    t.truthy(
      provisionPool,
      'provisionPool instance is published in agoricNames',
    );

    // Baseline: default is 0.25 BLD (StakeUnit * 25 / 100, BLD has 6 decimals).
    // The provisionPool governance node isn't in the typed published-path
    // registry, so cast to the GovernanceSubscriptionState shape we expect.
    const before = readPublished(PROVISION_POOL_GOVERNANCE_PATH) as {
      current: {
        PerAccountInitialAmount: { type: string; value: Amount<'nat'> };
      };
    };
    const beforeAmount = before.current.PerAccountInitialAmount.value;
    t.is(beforeAmount.value, 250_000n, 'baseline is 0.25 BLD');

    // Reuse the on-chain BLD brand so the proposed amount round-trips.
    const newAmount = AmountMath.make(beforeAmount.brand, 10_000_000n);

    // propose → accept invitations → vote → advance past the deadline.
    await governanceDriver.changeParams(provisionPool, {
      PerAccountInitialAmount: newAmount,
    });

    const outcome = await governanceDriver.getLatestOutcome();
    t.is(outcome.outcome, 'win', 'param-change question passed');

    // readPublished memoizes board remotes, so the brand in newAmount (from an
    // earlier read) shares identity with the freshly-read one and the whole
    // Amount deep-equals.
    t.context.expectParamValue(t, PROVISION_POOL_GOVERNANCE_PATH, newAmount, [
      'current',
      'PerAccountInitialAmount',
      'value',
    ]);
  },
);
