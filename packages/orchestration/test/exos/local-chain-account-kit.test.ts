import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import { M, makeScalarBigMapStore } from '@agoric/vat-data';
import { prepareLocalChainTools } from '@agoric/vats/src/localchain.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { buildRootObject as buildBankVatRoot } from '@agoric/vats/src/vat-bank.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { makeHeapZone } from '@agoric/zone';
import { E, Far } from '@endo/far';
import { makeFakeLocalchainBridge } from '../supports.js';
import { prepareLocalChainAccountKit } from '../../src/exos/local-chain-account-kit.js';
import { prepareMockChainInfo } from '../../src/utils/mockChainInfo.js';
import { ChainAddress } from '../../src/orchestration-api.js';
import { NANOSECONDS_PER_SECOND } from '../../src/utils/time.js';

test('localChainAccountKit - transfer', async t => {
  const bootstrap = async () => {
    const zone = makeHeapZone();
    const issuerKit = makeIssuerKit('BLD');
    const stake = withAmountUtils(issuerKit);

    const bankManager = await buildBankVatRoot(
      undefined,
      undefined,
      zone.mapStore('bankManager'),
    ).makeBankManager();

    await E(bankManager).addAsset('ubld', 'BLD', 'Staking Token', issuerKit);
    const localchainBridge = makeFakeLocalchainBridge(zone);
    const localchain = prepareLocalChainTools(
      zone.subZone('localchain'),
    ).makeLocalChain({
      bankManager,
      system: localchainBridge,
    });
    const timer = buildZoeManualTimer(t.log);
    const marshaller = makeFakeBoard().getReadonlyMarshaller();

    return {
      timer,
      localchain,
      marshaller,
      stake,
      issuerKit,
      rootZone: zone,
    };
  };

  const { timer, localchain, stake, marshaller, issuerKit, rootZone } =
    await bootstrap();

  t.log('chainInfo mocked via `prepareMockChainInfo` until #8879');
  const agoricChainInfo = prepareMockChainInfo(rootZone.subZone('chainInfo'));

  t.log('exo setup - prepareLocalChainAccountKit');
  const baggage = makeScalarBigMapStore<string, unknown>('baggage', {
    durable: true,
  });
  const { makeRecorderKit } = prepareRecorderKitMakers(baggage, marshaller);
  const makeLocalChainAccountKit = prepareLocalChainAccountKit(
    baggage,
    makeRecorderKit,
    // @ts-expect-error mocked zcf. use `stake-bld.contract.test.ts` to test LCA with offer
    Far('MockZCF', {}),
    timer,
    timer.getTimerBrand(),
    agoricChainInfo,
  );

  t.log('request account from vat-localchain');
  const lca = await E(localchain).makeAccount();
  const address = await E(lca).getAddress();

  t.log('make a LocalChainAccountKit');
  const { holder: account } = makeLocalChainAccountKit({
    account: lca,
    address,
    storageNode: makeMockChainStorageRoot().makeChildNode('lcaKit'),
  });

  t.truthy(account, 'account is returned');
  t.regex(await E(account).getAddress(), /agoric1/);

  const oneHundredStakeAmt = stake.make(1_000_000_000n);
  const oneHundredStakePmt = issuerKit.mint.mintPayment(oneHundredStakeAmt);
  const oneStakeAmt = stake.make(1_000_000n);

  t.log('deposit 100 bld to account');
  const depositResp = await E(account).deposit(oneHundredStakePmt);
  t.true(AmountMath.isEqual(depositResp, oneHundredStakeAmt), 'deposit');

  const destination: ChainAddress = {
    chainId: 'cosmoslocal',
    address: 'cosmos1pleab',
    addressEncoding: 'bech32',
  };

  // TODO #9211, support ERTP amounts
  t.log('ERTP Amounts not yet supported for AmountArg');
  await t.throwsAsync(() => E(account).transfer(oneStakeAmt, destination), {
    message: 'ERTP Amounts not yet supported',
  });

  t.log('.transfer() 1 bld to cosmos using DenomAmount');
  const transferResp = await E(account).transfer(
    { denom: 'ubld', value: 1_000_000n },
    destination,
  );
  t.is(transferResp, undefined, 'Successful transfer returns Promise<void>.');

  await t.throwsAsync(
    () => E(account).transfer({ denom: 'ubld', value: 504n }, destination),
    {
      message: 'simulated unexpected MsgTransfer packet timeout',
    },
  );

  const unknownDestination: ChainAddress = {
    chainId: 'fakenet',
    address: 'fakenet1pleab',
    addressEncoding: 'bech32',
  };
  await t.throwsAsync(
    () => E(account).transfer({ denom: 'ubld', value: 1n }, unknownDestination),
    {
      message: /not found(.*)fakenet/,
    },
    'cannot create transfer msg with unknown chainId',
  );

  await t.notThrowsAsync(
    () =>
      E(account).transfer({ denom: 'ubld', value: 10n }, destination, {
        memo: 'hello',
      }),
    'can create transfer msg with memo',
  );
  // TODO, intercept/spy the bridge message to see that it has a memo

  await t.notThrowsAsync(
    () =>
      E(account).transfer({ denom: 'ubld', value: 10n }, destination, {
        // sets to current time, which shouldn't work in a real env
        timeoutTimestamp: BigInt(new Date().getTime()) * NANOSECONDS_PER_SECOND,
      }),
    'accepts custom timeoutTimestamp',
  );

  await t.notThrowsAsync(
    () =>
      E(account).transfer({ denom: 'ubld', value: 10n }, destination, {
        timeoutHeight: { revisionHeight: 100n, revisionNumber: 1n },
      }),
    'accepts custom timeoutHeight',
  );
});
