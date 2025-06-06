import anyTest from '@endo/ses-ava/prepare-endo.js';

import { makeTracer, mustMatch } from '@agoric/internal';
import type { ExecutionContext } from 'ava';
import { commonSetup } from '../support.ts';

import { AmountMath } from '@agoric/ertp';
import { ChainInfoShape } from '@agoric/orchestration';
import type {
  CurrentWalletRecord,
  UpdateRecord,
} from '@agoric/smart-wallet/src/smartWallet.js';
import { M } from '@endo/patterns';
import type { TestFn } from 'ava';
import { meta } from '../../../packages/portfolio-contract/src/portfolio.contract.meta.ts';
import starshipChainInfo from '../../starship-chain-info.js';
import { seatLike } from '../../tools/e2e-tools.js';
import { getStarshipChainInfo } from '../../tools/chain-info-registry.ts';

const trace = makeTracer('MCYMX');

const { fromEntries, keys, values } = Object;
const { make } = AmountMath;

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

const keyMaterial = {
  trader1:
    'cause eight cattle slot course mail more aware vapor slab hobby match',
} as const;
harden(keyMaterial);

const makeTestContext = async (t: ExecutionContext) => {
  const common = await commonSetup(t, {
    // TODO: config with just agoric, noble
    config: `../config.fusdc.yaml`,
  });
  const { deleteTestKeys, setupTestKeys, faucetTools, startContract } = common;

  await deleteTestKeys(keys(keyMaterial)); // XXX???
  const accounts = (await setupTestKeys(
    keys(keyMaterial),
    values(keyMaterial),
  )) as Record<keyof typeof keyMaterial, string>;
  t.log('setupTestKeys:', accounts);

  await common.changeVotingPeriod(5n); // TODO: skip if done already

  const chainInfoNeeded = async () => {
    const { vstorageClient: vsc } = common;
    try {
      const { namespace, reference } = await vsc.queryData(
        'published.agoricNames.chain.agoric',
      );
      t.log('agoric', { namespace, reference });
      return !(namespace === 'cosmos' && reference === 'agoriclocal');
    } catch {
      return true;
    }
  };
  if (await chainInfoNeeded()) {
    const chainInfo = await getStarshipChainInfo({ fetch: globalThis.fetch });
    await common.deployBuilder(
      '../packages/builders/scripts/orchestration/chain-info.build.js',
      { chainInfo: JSON.stringify(chainInfo) },
    );
  }

  await startContract(
    meta.name,
    '../packages/portfolio-contract/scripts/portfolio.build.js',
    { chainInfo, assetInfo },
    // { skipInstanceCheck: true }, // XXX
  );

  return { ...common, accounts };
};

test.before(async t => (t.context = await makeTestContext(t)));
test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(keys(keyMaterial));
});

test.serial('starship chain info shape', t => {
  t.notThrows(() =>
    mustMatch(starshipChainInfo, M.recordOf(M.string(), ChainInfoShape)),
  );
});

type VStorageClient = Awaited<ReturnType<typeof commonSetup>>['vstorageClient'];

// TODO: factor out of fu-actors?
export const agoricNamesQ = (vsc: VStorageClient) =>
  harden({
    brands: <K extends AssetKind>(_assetKind: K) =>
      vsc
        .queryData('published.agoricNames.brand')
        .then(pairs => fromEntries(pairs) as Record<string, Brand<K>>),
    instance: (name: string) =>
      vsc
        .queryData('published.agoricNames.instance')
        .then(pairs => fromEntries(pairs)[name] as Instance),
  });
const walletQ = (vsc: VStorageClient) => {
  const self = harden({
    current: (addr: string) =>
      vsc.queryData(
        `published.wallet.${addr}.current`,
      ) as Promise<CurrentWalletRecord>,
    update: (addr: string) =>
      vsc.queryData(`published.wallet.${addr}`) as Promise<UpdateRecord>,
  });
  return self;
};

test.serial('open a USDN position', async t => {
  const { provisionSmartWallet, accounts, faucetTools } = t.context;

  await faucetTools.fundFaucet([['noble', 'uusdc']]);

  const wallet = await provisionSmartWallet(accounts.trader1, {
    USDC: 8_000n, // XXX user story calls for 10k, but faucet doesn't provide quite that much
    BLD: 100n,
  });

  const { vstorageClient } = t.context;
  const { USDC } = await agoricNamesQ(vstorageClient).brands('nat');
  const give = { USDN: make(USDC, 3_333n * 1_000_000n) };
  t.log('opening portfolio', give);
  const updates = wallet.offers.executeOffer({
    id: `open-${Date.now()}`, // XXX ambient
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['ymax0'],
      callPipe: [['makeOpenPortfolioInvitation']],
    },
    proposal: { give },
  });
  const seat = seatLike(updates);
  const payoutAmounts = await seat.getPayoutAmounts();
  t.log('payouts', payoutAmounts);
  t.truthy(payoutAmounts);

  const current = await walletQ(vstorageClient).current(accounts.trader1);
  t.log('trader1 current', current);
  t.truthy(current);
});
