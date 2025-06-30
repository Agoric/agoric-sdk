/**
 * @file check whether things are already deployed
 */
import anyTest from '@endo/ses-ava/prepare-endo.js';

import {
  LOCAL_CONFIG,
  makeSmartWalletKit,
  makeVstorageKit,
  type VStorage,
} from '@agoric/client-utils';
import {
  denomHash,
  type CosmosChainInfo,
  type IBCConnectionInfo,
} from '@agoric/orchestration';
import type { TestFn } from 'ava';

const { fromEntries, keys, values } = Object;

// cf. ymax-tool
const trader1ag = 'agoric1yupasge4528pgkszg9v328x4faxtkldsnygwjl';
// cf. config.ymax.yml
const agoricRest = 'http://localhost:1317';

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

test.before(async t => (t.context = await makeTestContext(t)));

const makeTestContext = async _t => {
  const vstorageClient = makeVstorageKit({ fetch }, LOCAL_CONFIG);
  const { vstorage } = vstorageClient;
  const delay = async (ms: number) =>
    new Promise(resolve => setTimeout(resolve, ms)) as Promise<void>;
  const walletKit = await makeSmartWalletKit(
    { fetch, delay, names: false },
    LOCAL_CONFIG,
  );

  return {
    setTimeout,
    clearTimeout,
    fetch: globalThis.fetch,
    vstorage,
    vstorageClient,
    walletKit,
  };
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
  const { upoc26 } = asset;
  t.truthy(asset.upoc26);
  t.log('E(bank).getId(vbank.upoc26.brand):', id(upoc26.brand));
  t.true('PoC26' in brand);
  t.true('PoC26' in issuer);
  t.is(id(brand.PoC26), id(asset.upoc26.brand));
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

/**
 * Read values going back as far as available
 */
async function* readHistory(
  path,
  {
    vstorage,
    setTimeout,
    clearTimeout,
    timeout = 500,
  }: {
    vstorage: VStorage;
    setTimeout: Window['setTimeout'];
    clearTimeout: Window['clearTimeout'];
    timeout?: number;
  },
  minHeight = undefined,
) {
  // undefined the first iteration, to query at the highest
  let blockHeight;
  await null;
  const timed = <T>(p: Promise<T>): Promise<T> => {
    let id;
    const clear = () => {
      clearTimeout(id);
    };
    const fuse = new Promise(r => setTimeout(r, timeout)).then(() => {
      throw Error('timeout');
    });
    // @ts-expect-error XXX not sure how to type this
    return Promise.race([p.finally(clear), fuse.then(clear)]);
  };
  do {
    // console.debug('READING', { blockHeight });
    let values: unknown[] = [];
    try {
      ({ blockHeight, values } = await timed(
        vstorage.readAt(path, blockHeight && Number(blockHeight) - 1),
      ));
      // console.debug('readAt returned', { blockHeight });
    } catch (err) {
      if (
        err.message.match(/unknown request/) ||
        err.message === 'Unexpected end of JSON input'
      ) {
        // XXX FIXME
        // console.error(err);
        break;
      }
      throw err;
    }
    yield { blockHeight, values };
    // console.debug('PUSHED', values);
    // console.debug('NEW', { blockHeight, minHeight });
    if (minHeight && Number(blockHeight) <= Number(minHeight)) break;
  } while (blockHeight > 0);
}

const range = (n: number) => [...Array(n).keys()];

test('portfolio-opened', async t => {
  //   t.timeout(1_000);
  const { walletKit: wk, vstorageClient: vsc, vstorage: vs } = t.context;
  const { setTimeout, clearTimeout } = t.context;

  t.log('address', trader1ag);
  const cur = await wk.getCurrentWalletRecord(trader1ag);
  // t.log(cur);
  const { offerToPublicSubscriberPaths } = cur;
  const byOfferId = fromEntries(offerToPublicSubscriberPaths);
  //   t.log(byOfferId);
  const portfolioKeys = values(byOfferId)
    .filter(sub => 'portfolio' in sub)
    .map(sub => sub.portfolio);
  t.log('portfolios', portfolioKeys);
  t.true(portfolioKeys.length > 0);

  const chopPub = (key: string) => key.replace(/^published./, '');
  for (const portfolioKey of portfolioKeys) {
    const portfolioInfo = await vsc.readPublished(chopPub(portfolioKey));
    t.log(portfolioKey, portfolioInfo);
    // XXX static type for vstorage schema
    const { positionCount, flowCount } = portfolioInfo as Record<
      string,
      number
    >;
    for (const positionNum of range(positionCount).map(x => x + 1)) {
      const positionKey = `${portfolioKey}.positions.position${positionNum}`; // XXX reuse func for this
      const positionInfo = await vsc.readPublished(chopPub(positionKey));
      t.log(positionKey, positionInfo);
    }
    for (const flowNum of range(flowCount).map(x => x + 1)) {
      const flowKey = `${portfolioKey}.flows.flow${flowNum}`; // XXX reuse func for this
      try {
        for await (const { blockHeight, values } of readHistory(flowKey, {
          vstorage: vs,
          setTimeout,
          clearTimeout,
        })) {
          try {
            const [jsonCapData] = values as string[];
            const info = vsc.marshaller.fromCapData(JSON.parse(jsonCapData));
            t.log(flowKey, blockHeight, info);
          } catch (err) {
            t.log(blockHeight, values, err);
          }
        }
      } catch (err) {
        // ignore SyntaxError: Unexpected end of JSON input
        console.error('readHistory', err);
        return;
      }
    }
  }
});
