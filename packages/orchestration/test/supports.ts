import { makeIssuerKit } from '@agoric/ertp';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { prepareLocalChainTools } from '@agoric/vats/src/localchain.js';
import { makeFakeBankManagerKit } from '@agoric/vats/tools/bank-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { makeFakeLocalchainBridge } from '@agoric/vats/tools/fake-bridge.js';
import type { Installation } from '@agoric/zoe/src/zoeService/utils.js';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { makeHeapZone } from '@agoric/zone';
import { E } from '@endo/far';

export { makeFakeLocalchainBridge } from '@agoric/vats/tools/fake-bridge.js';

export const commonSetup = async t => {
  t.log('bootstrap vat dependencies');
  // The common setup cannot support a durable zone because many of the fakes are not durable.
  // They were made before we had durable kinds (and thus don't take a zone or baggage).
  // To test durability in unit tests, test a particular entity with `relaxDurabilityRules: false`.
  // To test durability integrating multiple vats, use a RunUtils/bootstrap test.
  const rootZone = makeHeapZone();
  const bld = withAmountUtils(makeIssuerKit('BLD'));
  const ist = withAmountUtils(makeIssuerKit('IST'));

  const { bankManager, pourPayment } = await makeFakeBankManagerKit();
  await E(bankManager).addAsset('ubld', 'BLD', 'Staking Token', bld.issuerKit);
  await E(bankManager).addAsset(
    'uist',
    'IST',
    'Inter Stable Token',
    ist.issuerKit,
  );

  const localchainBridge = makeFakeLocalchainBridge(rootZone);
  const localchain = prepareLocalChainTools(
    rootZone.subZone('localchain'),
  ).makeLocalChain({
    bankManager,
    system: localchainBridge,
  });
  const timer = buildZoeManualTimer(t.log);
  const marshaller = makeFakeBoard().getReadonlyMarshaller();
  const storage = makeFakeStorageKit('mockChainStorageRoot', {
    sequence: false,
  });
  return {
    bootstrap: {
      bankManager,
      timer,
      localchain,
      marshaller,
      rootZone,
      storage,
    },
    brands: {
      // TODO consider omitting `issuer` to prevent minting, which the bank can't observe
      bld,
      ist,
    },
    utils: {
      pourPayment,
    },
  };
};

export const makeDefaultContext = <SF>(contract: Installation<SF>) => {};
