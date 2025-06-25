/**
 * @file check whether things are already deployed
 */
import anyTest from '@endo/ses-ava/prepare-endo.js';

import { LOCAL_CONFIG, makeVstorageKit } from '@agoric/client-utils';
import {
  denomHash,
  type CosmosChainInfo,
  type IBCConnectionInfo,
} from '@agoric/orchestration';
import type { TestFn } from 'ava';

// cf. ymax-tool
const trader1ag = 'agoric1yupasge4528pgkszg9v328x4faxtkldsnygwjl';
// cf. config.ymax.yml
const agoricRest = 'http://localhost:1317';

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

test.before(async t => (t.context = await makeTestContext(t)));

const makeTestContext = async t => {
  const vstorageClient = makeVstorageKit({ fetch }, LOCAL_CONFIG);

  return { fetch: globalThis.fetch, vstorageClient };
};

test('chain-info', async t => {
  const { vstorageClient: vsc } = t.context;
  const { vstorage: vs } = vsc;

  const kinds = await vs.keys('published.agoricNames');
  t.log('keys(agoricNames).length:', kinds.length);
  t.true(kinds.includes('chain'));
  t.true(kinds.includes('chainConnection'));

  const chainNames = await vs.keys('published.agoricNames.chain');
  t.log('chains:', chainNames.join(','));
  t.true(chainNames.includes('agoric'), 'agoric chain present');
  t.true(chainNames.includes('noble'), 'noble chain present');
  const chainInfo = fromEntries(
    await Promise.all(
      chainNames.map(async n => [
        n,
        await vsc.readPublished(`agoricNames.chain.${n}`),
      ]),
    ),
  ) as Record<string, CosmosChainInfo>;
  const { agoric, noble } = chainInfo;

  const conns = await vs.keys('published.agoricNames.chainConnection');
  t.log('connections:', conns.join(','));
  const toNoble = `${agoric.chainId}_${noble.chainId}`;
  t.true(conns.includes(toNoble), 'agoric->noble present');

  const id = it => it.getBoardId();
  const { transferChannel } = (await vsc.readPublished(
    `agoricNames.chainConnection.${toNoble}`,
  )) as IBCConnectionInfo;
  const path = {
    port: 'transfer',
    channelId: transferChannel.counterPartyChannelId,
    denom: 'uusdc',
  };
  const denom = `ibc/${denomHash(path)}`;
  t.log('USDC on agoric:', path, denom);
  const asset = fromEntries(await vsc.readPublished('agoricNames.vbankAsset'));
  const { [denom]: USDC } = asset;
  t.is(USDC.issuerName, 'USDC');
  t.log('E(bank).getId(vbank.${denom}.brand):', id(USDC.brand));
});

const { fromEntries, keys, values } = Object;

test('beneficiary-wallet', async t => {
  const { vstorage: vs } = t.context.vstorageClient;
  const w = await vs.keys('published.wallet');
  t.log(trader1ag);
  t.true(w.includes(trader1ag));
});

test('poc-asset', async t => {
  const { vstorageClient: vsc } = t.context;
  await null;

  const id = it => it.getBoardId();
  const issuer = fromEntries(await vsc.readPublished('agoricNames.issuer'));
  t.log('issuer names:', keys(issuer).join(','));
  const brand = fromEntries(await vsc.readPublished('agoricNames.brand'));
  t.log('brand names:', keys(brand).join(','));
  const asset = fromEntries(await vsc.readPublished('agoricNames.vbankAsset'));
  const { upoc25 } = asset;
  t.truthy(asset.upoc25);
  t.log('E(bank).getId(vbank.upoc25.brand):', id(upoc25.brand));
  t.true('PoC25' in brand);
  t.true('PoC25' in issuer);
  t.is(id(brand.PoC25), id(asset.upoc25.brand));
});

test('ymax-deployed', async t => {
  const { vstorageClient: vsc } = t.context;

  const instance = fromEntries(await vsc.readPublished('agoricNames.instance'));
  t.true('ymax0' in instance);
  const id = it => it.getBoardId();
  t.log('ymax0 instance boardId:', id(instance.ymax0));
});

test('usdc-available', async t => {
  const { fetch } = t.context;

  const { balances } = await fetch(
    `${agoricRest}/cosmos/bank/v1beta1/balances/${trader1ag}`,
  ).then(r => r.json());
  const byDenom = fromEntries(balances.map(b => [b.denom, BigInt(b.amount)]));
  t.log('balances:', byDenom);

  const channelId = 'channel-0';
  const path = { channelId, denom: 'uusdc' };
  const denom = `ibc/${denomHash(path)}`;
  t.true(denom in byDenom);
  t.log('balance', byDenom[denom]);
  t.true(byDenom[denom] >= 1_000_000n);
});
