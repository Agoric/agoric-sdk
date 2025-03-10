import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { makeDoOffer } from '../tools/e2e-tools.js';
import {
  commonSetup,
  type SetupContextWithWallets,
  chainConfig,
} from './support.js';
import { createWallet } from '../tools/wallet.js';
import { AmountMath } from '@agoric/ertp';
import { makeQueryClient } from '../tools/query.js';
import type { Amount } from '@agoric/ertp/src/types.js';

const test = anyTest as TestFn<SetupContextWithWallets>;

const accounts = ['osmosis1', 'osmosis2', 'cosmoshub1', 'cosmoshub2'];

const contractName = 'sendAnywhere';
const contractBuilder =
  '../packages/builders/scripts/testing/init-send-anywhere.js';

test.before(async t => {
  const { setupTestKeys, ...common } = await commonSetup(t);
  const { commonBuilderOpts, deleteTestKeys, faucetTools, startContract } =
    common;
  await deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts);
  t.context = { ...common, wallets };
  await startContract(contractName, contractBuilder, commonBuilderOpts);

  await faucetTools.fundFaucet([
    ['cosmoshub', 'uatom'],
    ['osmosis', 'uosmo'],
  ]);
});

test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(accounts);
});

type BrandKW = 'IST' | 'OSMO' | 'ATOM';

const sendAnywhereScenario = test.macro({
  title: (_, destChainName: string, acctIdx: number, brandKw: BrandKW) =>
    `send-anywhere ${brandKw} from agoric to ${destChainName}${acctIdx}`,
  exec: async (t, destChainName: string, acctIdx: number, brandKw: BrandKW) => {
    const config = chainConfig[destChainName];
    if (!config) return t.fail(`Unknown chain: ${destChainName}`);

    const {
      wallets,
      provisionSmartWallet,
      vstorageClient,
      retryUntilCondition,
      useChain,
    } = t.context;

    t.log('Create a receiving wallet for the send-anywhere transfer');
    const chain = useChain(destChainName).chain;

    t.log('Create an agoric smart wallet to initiate send-anywhere transfer');
    const agoricAddr = wallets[`${destChainName}${acctIdx}`];
    const wdUser1 = await provisionSmartWallet(agoricAddr, {
      BLD: 1_000n,
      [brandKw]: 1_000n,
    });
    t.log(`provisioning agoric smart wallet for ${agoricAddr}`);

    const doOffer = makeDoOffer(wdUser1);

    const brands = await vstorageClient.queryData(
      'published.agoricNames.brand',
    );
    const brand = Object.fromEntries(brands)[brandKw];

    const apiUrl = await useChain(destChainName).getRestEndpoint();
    const queryClient = makeQueryClient(apiUrl);
    t.log(`Made ${destChainName} query client`);

    const doSendAnywhere = async (amount: Amount) => {
      t.log(`Sending ${amount.value} ${amount.brand}.`);
      const wallet = await createWallet(chain.bech32_prefix);
      const receiver = {
        chainId: chain.chain_id,
        value: (await wallet.getAccounts())[0].address,
        encoding: 'bech32',
      };
      t.log('Will send payment to:', receiver);
      t.log(`${destChainName} offer`);
      const offerId = `${destChainName}-makeSendInvitation-${Date.now()}`;
      await doOffer({
        id: offerId,
        invitationSpec: {
          source: 'agoricContract',
          instancePath: [contractName],
          callPipe: [['makeSendInvitation']],
        },
        offerArgs: { destAddr: receiver.value, chainName: destChainName },
        proposal: { give: { Send: amount } },
      });

      const { balances } = await retryUntilCondition(
        () => queryClient.queryBalances(receiver.value),
        ({ balances }) => 'amount' in balances[0],
        `${receiver.value} ${amount.value} balance available from send-anywhere`,
      );

      t.log(`${receiver.value} Balances`, balances);
      t.like(balances, [
        {
          // XXX consider verifying uist hash
          amount: String(amount.value),
        },
      ]);
    };

    const makeRandomValue = (min: number, max: number) =>
      BigInt(Math.floor(Math.random() * (max - min + 1)) + min);
    // send 3 offers from each account. different values help distinguish
    // one offer/result from another.
    const offerAmounts = [
      makeRandomValue(1, 33),
      makeRandomValue(34, 66),
      makeRandomValue(67, 100),
    ];
    console.log(`${agoricAddr} offer amounts:`, offerAmounts);

    for (const value of offerAmounts) {
      await doSendAnywhere(AmountMath.make(brand, value));
    }
  },
});

test.serial(sendAnywhereScenario, 'osmosis', 1, 'IST');
test.serial(sendAnywhereScenario, 'osmosis', 2, 'ATOM'); // exercises PFM (agoric -> cosmoshub -> osmosis)
test.serial(sendAnywhereScenario, 'cosmoshub', 1, 'IST');
test.serial(sendAnywhereScenario, 'cosmoshub', 2, 'OSMO'); // exercises PFM (agoric -> osmosis -> cosmoshub)
