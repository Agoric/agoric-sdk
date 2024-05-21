// @ts-check
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { reincarnate } from '@agoric/swingset-liveslots/tools/setup-vat-data.js';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { getInterfaceOf } from '@endo/marshal';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { buildRootObject as buildBankVatRoot } from '../src/vat-bank.js';
import { prepareLocalChainTools } from '../src/localchain.js';

/**
 * @import {LocalChainAccount, LocalChainPowers} from '../src/localchain.js';
 * @import {BridgeHandler, ScopedBridgeManager} from '../src/types.js';
 */

/** @type {import('ava').TestFn<ReturnType<makeTestContext>>} */
const test = anyTest;

const { fakeVomKit } = reincarnate({ relaxDurabilityRules: false });
const provideBaggage = key => {
  const root = fakeVomKit.cm.provideBaggage();
  const zone = makeDurableZone(root);
  return zone.mapStore(`${key} baggage`);
};

// TODO use testing facilities from #9396
const makeTestContext = async t => {
  const makeBridgeManager = async () => {
    const zone = makeDurableZone(provideBaggage('mockBridgeManager'));
    /** @type {undefined | ERef<BridgeHandler>} */
    let bridgeHandler;

    /** @type {ScopedBridgeManager<'vlocalchain'>} */
    const bridgeManager = zone.exo('BridgeManager', undefined, {
      async fromBridge(obj) {
        t.is(typeof obj, 'string');
      },
      async toBridge(obj) {
        switch (obj.type) {
          case 'VLOCALCHAIN_ALLOCATE_ADDRESS': {
            t.log('VLOCALCHAIN_ALLOCATE_ADDRESS', obj);
            return 'agoricfoo';
          }
          default: {
            t.is(obj, null);
            return undefined;
          }
        }
      },
      initHandler(newHandler) {
        bridgeHandler = newHandler;
      },
      setHandler(newHandler) {
        bridgeHandler = newHandler;
      },
    });
    return { bridgeManager, bridgeHandler };
  };

  const { bridgeManager } = await makeBridgeManager();

  const makeBankManager = () => {
    const zone = makeDurableZone(provideBaggage('bank'));
    return buildBankVatRoot(
      undefined,
      undefined,
      zone.mapStore('bankManager'),
    ).makeBankManager();
  };

  const bankManager = await makeBankManager();

  /** @param {LocalChainPowers} powers */
  const makeLocalChain = async powers => {
    const zone = makeDurableZone(provideBaggage('localchain'));
    return prepareLocalChainTools(zone.subZone('localchain')).makeLocalChain(
      powers,
    );
  };

  const localchain = await makeLocalChain({
    system: bridgeManager,
    bankManager,
  });

  return {
    bankManager,
    localchain,
  };
};

test.beforeEach(t => {
  t.context = makeTestContext(t);
});

test('localchain - deposit and withdraw', async t => {
  const issuerKits = ['BLD', 'BEAN'].map(x =>
    makeIssuerKit(x, AssetKind.NAT, harden({ decimalPlaces: 6 })),
  );
  const [bld, bean] = issuerKits.map(withAmountUtils);

  const boot = async () => {
    const { bankManager } = await t.context;
    await t.notThrowsAsync(
      E(bankManager).addAsset('ubld', 'BLD', 'Staking Token', issuerKits[0]),
    );
  };
  await boot();

  const makeContract = async () => {
    const { localchain } = await t.context;
    /** @type {LocalChainAccount | undefined} */
    let contractsLca;
    const contractsBldPurse = bld.issuer.makeEmptyPurse();
    // contract starts with 100 BLD in its Purse
    contractsBldPurse.deposit(bld.mint.mintPayment(bld.make(100_000_000n)));

    return {
      makeAccount: async () => {
        const lca = await E(localchain).makeAccount();
        t.is(getInterfaceOf(lca), 'Alleged: LocalChainAccount');

        const address = await E(lca).getAddress();
        t.is(address, 'agoricfoo');
        contractsLca = lca;
      },
      deposit: async () => {
        if (!contractsLca) throw Error('LCA not found.');
        const fiftyBldAmt = bld.make(50_000_000n);
        const res = await E(contractsLca).deposit(
          contractsBldPurse.withdraw(fiftyBldAmt),
        );
        t.true(AmountMath.isEqual(res, fiftyBldAmt));
        const payment2 = contractsBldPurse.withdraw(fiftyBldAmt);
        await t.throwsAsync(
          () =>
            // @ts-expect-error LCA is possibly undefined
            E(contractsLca).deposit(payment2, {
              brand: M.remotable('Brand'),
              value: M.record(),
            }),
          {
            message: /amount(.+) Must be a copyRecord/,
          },
        );
        await E(contractsLca).deposit(payment2, {
          brand: M.remotable('Brand'),
          value: M.nat(),
        });
      },
      withdraw: async () => {
        if (!contractsLca) throw Error('LCA not found.');
        const oneHundredBldAmt = bld.make(100_000_000n);
        const oneHundredBeanAmt = bean.make(100_000_000n);
        const payment = await E(contractsLca).withdraw(oneHundredBldAmt);
        // @ts-expect-error Argument of type 'Payment' is not assignable to parameter of type 'ERef<Payment<"nat", any>>'.
        const paymentAmount = await E(bld.issuer).getAmountOf(payment);
        t.true(AmountMath.isEqual(paymentAmount, oneHundredBldAmt));

        await t.throwsAsync(
          // @ts-expect-error LCA is possibly undefined
          () => E(contractsLca).withdraw(oneHundredBldAmt),
          {
            message: /Withdrawal (.+) failed (.+) purse only contained/,
          },
        );

        // @ts-expect-error LCA is possibly undefined
        await t.throwsAsync(() => E(contractsLca).withdraw(oneHundredBeanAmt), {
          message: /not found in collection "brandToAssetRecord"/,
        });
      },
    };
  };

  const anOrchestrationContract = await makeContract();
  await anOrchestrationContract.makeAccount();

  await anOrchestrationContract.deposit();
  await anOrchestrationContract.withdraw();
});
