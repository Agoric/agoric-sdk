// @ts-check

import { Fail } from '@endo/errors';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import {
  deeplyFulfilledObject,
  makeTracer,
  NonNullish,
} from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { makeNotifierFromSubscriber } from '@agoric/notifier';
import { makeNameHubKit } from '@agoric/vats';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';

const trace = makeTracer('BootFAUpg');

export const faV1BundleName = 'fluxAggregatorV1';

const inKit = makeIssuerKit('bucks');
const outKit = makeIssuerKit('moola');

export const buildRootObject = async () => {
  const storageKit = makeFakeStorageKit('fluxAggregatorUpgradeTest');
  const { nameAdmin: namesByAddressAdmin } = makeNameHubKit();
  const timer = buildZoeManualTimer();
  const marshaller = makeFakeBoard().getReadonlyMarshaller();

  /** @type {PromiseKit<ZoeService>} */
  const { promise: zoe, ...zoePK } = makePromiseKit();
  const { promise: committeeCreator, ...ccPK } = makePromiseKit();

  /** @type {VatAdminSvc} */
  let vatAdmin;

  let initialPoserInvitation;
  let poserInvitationAmount;

  // for startInstance
  /**
   * @type {{
   *   committee?: Installation<
   *     import('@agoric/governance/src/committee.js')['start']
   *   >;
   *   fluxAggregatorV1?: Installation<
   *     import('../../../src/price/fluxAggregatorContract.js').start
   *   >;
   *   puppetContractGovernor?: Installation<
   *     import('@agoric/governance/tools/puppetContractGovernor.js').start
   *   >;
   * }}
   */
  const installations = {};

  let governorFacets;
  /**
   * @type {ReturnType<
   *   Awaited<
   *     ReturnType<
   *       import('../../../src/price/fluxAggregatorContract.js').start
   *     >
   *   >['creatorFacet']['getLimitedCreatorFacet']
   * >}
   */
  let faLimitedFacet;

  /** @type {import('../../../src/price/priceOracleKit.js').OracleKit} */
  let oracleA;
  /** @type {Subscriber<any>} */
  let quoteSubscriber1;
  /** @type {UpdateRecord<any>} */
  let lastQuote;

  /**
   * @type {Omit<
   *   import('@agoric/zoe/src/zoeService/utils.js').StartParams<
   *     import('../../../src/price/fluxAggregatorContract.js').start
   *   >['terms'],
   *   'issuers' | 'brands'
   * >}
   */
  const faTerms = {
    // driven by one oracle
    maxSubmissionCount: 1,
    minSubmissionCount: 1,
    restartDelay: 0n,
    timeout: 5,
    maxSubmissionValue: 1_000_000,
    minSubmissionValue: 1,

    brandIn: inKit.brand,
    brandOut: outKit.brand,
    timer,
    unitAmountIn: AmountMath.make(inKit.brand, 1_000_000n),

    // @ts-expect-error xxx
    governedParams: {
      [CONTRACT_ELECTORATE]: {
        type: ParamTypes.INVITATION,
      },
    },
  };
  const staticPrivateArgs = {
    storageNode: storageKit.rootNode,
    marshaller,
    namesByAddressAdmin,
  };

  return Far('root', {
    bootstrap: async (vats, devices) => {
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      const { zoeService } = await E(vats.zoe).buildZoe(
        vatAdmin,
        undefined,
        'zcf',
      );
      zoePK.resolve(zoeService);

      const v1BundleId = await E(vatAdmin).getBundleIDByName(faV1BundleName);
      v1BundleId || Fail`bundleId must not be empty`;
      installations.fluxAggregatorV1 = await E(zoe).installBundleID(v1BundleId);

      installations.puppetContractGovernor = await E(zoe).installBundleID(
        await E(vatAdmin).getBundleIDByName('puppetContractGovernor'),
      );

      installations.committee = await E(zoe).installBundleID(
        await E(vatAdmin).getBundleIDByName('committee'),
      );
      const ccStartResult = await E(zoe).startInstance(
        installations.committee,
        harden({}),
        {
          committeeName: 'Demos',
          committeeSize: 1,
        },
        {
          storageNode: storageKit.rootNode.makeChildNode('thisCommittee'),
          marshaller,
        },
      );
      ccPK.resolve(ccStartResult.creatorFacet);

      const poserInvitationP = E(committeeCreator).getPoserInvitation();
      [initialPoserInvitation, poserInvitationAmount] = await Promise.all([
        poserInvitationP,
        E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
      ]);
    },

    buildV1: async () => {
      trace(`BOOT buildV1 start`);
      // build the contract vat from ZCF and the contract bundlecap

      // @ts-expect-error xxx
      faTerms.governedParams[CONTRACT_ELECTORATE].value = poserInvitationAmount;

      const governorTerms = await deeplyFulfilledObject(
        harden({
          timer,
          governedContractInstallation: NonNullish(
            installations.fluxAggregatorV1,
          ),
          governed: {
            terms: faTerms,
            label: 'fluxAggregatorV1',
          },
        }),
      );
      trace('got governorTerms', governorTerms);

      // Complete round-trip without upgrade
      trace(`BOOT buildV1 startInstance`);
      governorFacets = await E(zoe).startInstance(
        NonNullish(installations.puppetContractGovernor),
        undefined,
        // @ts-expect-error
        governorTerms,
        {
          governed: {
            ...staticPrivateArgs,
            initialPoserInvitation,
          },
        },
      );
      trace('BOOT buildV1 started instance');

      // @ts-expect-error XXX governance types https://github.com/Agoric/agoric-sdk/issues/7178
      faLimitedFacet = await E(governorFacets.creatorFacet).getCreatorFacet();

      oracleA = await E(faLimitedFacet).initOracle('oracleA');

      trace('BOOT buildV1 made oracleA');

      return true;
    },

    testFunctionality1: async () => {
      const faPublicFacet = await E(
        governorFacets.creatorFacet,
      ).getPublicFacet();

      const publicTopics = await E(faPublicFacet).getPublicTopics();
      assert.equal(
        publicTopics.latestRound.description,
        'Notification of each round',
      );
      assert.equal(
        publicTopics.quotes.description,
        'Quotes from this price aggregator',
      );

      trace('testFunctionality pushing price');
      await timer.tickN(1);
      const unitPrice = 123n;
      await E(oracleA.oracle).pushPrice({ roundId: 1, unitPrice });
      quoteSubscriber1 = await publicTopics.quotes.subscriber;

      const quoteNotifier = makeNotifierFromSubscriber(quoteSubscriber1);

      trace('testFunctionality awaiting quoteNotifier1');
      lastQuote = await quoteNotifier.getUpdateSince();
      assert.equal(lastQuote.updateCount, 1n);
      assert.equal(lastQuote.value.amountOut.value, unitPrice);

      // XXX t.throwsAsync sure would be nice
      await E(governorFacets.creatorFacet)
        .invokeAPI('removeOracles', [['oracleB']])
        .then(() => Error('this should have errored'))
        .catch(reason => {
          assert.equal(
            reason.message,
            'key oracleB not found in collection oracles',
          );
        });
      await timer.tickN(1);
    },

    nullUpgradeV1: async () => {
      trace(`BOOT nullUpgradeV1 start`);

      const bundleId = await E(vatAdmin).getBundleIDByName(faV1BundleName);

      trace(`BOOT nullUpgradeV1 upgradeContract`);
      const faAdminFacet = await E(governorFacets.creatorFacet).getAdminFacet();
      const upgradeResult = await E(faAdminFacet).upgradeContract(bundleId, {
        ...staticPrivateArgs,
        initialPoserInvitation,
      });
      assert.equal(upgradeResult.incarnationNumber, 1);
      trace(`BOOT nullUpgradeV1 upgradeContract completed`);

      await timer.tickN(1);
      return true;
    },

    testFunctionality2: async () => {
      const faPublicFacet = await E(
        governorFacets.creatorFacet,
      ).getPublicFacet();

      const publicTopics = await E(faPublicFacet).getPublicTopics();
      const quoteSubscriber2 = await publicTopics.quotes.subscriber;
      assert(
        quoteSubscriber2 === quoteSubscriber1,
        'same subscriber object after upgrade',
      );

      trace('testFunctionality2 pushing price');
      // advance time to allow new round
      await timer.tickN(1);
      const unitPrice = 234n;
      await E(oracleA.oracle).pushPrice({ roundId: 2, unitPrice });
      await null; // xxx

      trace('testFunctionality awaiting quotes');
      const quoteNotifier = makeNotifierFromSubscriber(
        publicTopics.quotes.subscriber,
      );
      lastQuote = await quoteNotifier.getUpdateSince(lastQuote.updateCount);
      assert.equal(lastQuote.updateCount, 2n); // incremented durable subscriber

      trace('testFunctionality awaiting quote again');
      lastQuote = await quoteNotifier.getUpdateSince(lastQuote.updateCount);
      assert.equal(lastQuote.updateCount, 3n);
      assert.equal(lastQuote.value.amountOut.value, unitPrice);
    },

    // this test doesn't upgrade to a new bundle because we have coverage elsewhere that
    // a new bundle will replace the behavior of the prior bundle
  });
};
