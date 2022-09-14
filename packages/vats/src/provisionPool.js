// @jessie-check
// @ts-check

import { fit, M, makeHeapFarInstance, makeScalarMapStore } from '@agoric/store';
import { E, Far } from '@endo/far';
// TODO: move to narrower package?
import { observeIteration, observeNotifier } from '@agoric/notifier';
import { AmountMath } from '@agoric/ertp';
import {
  handleParamGovernance,
  ParamTypes,
  publicMixinAPI,
} from '@agoric/governance';
import { makeMetricsPublishKit } from '@agoric/inter-protocol/src/contractSupport.js';
import {
  makeMyAddressNameAdminKit,
  PowerFlags,
} from './core/basic-behaviors.js';

const { details: X, quote: q } = assert;

const privateArgsShape = harden({
  poolBank: M.eref(M.remotable('bank')),
  initialPoserInvitation: M.remotable('Invitation'),
  storageNode: M.eref(M.remotable('storageNode')),
  marshaller: M.eref(M.remotable('marshaller')),
});

/**
 * @typedef {object} MetricsNotification
 * Metrics naming scheme is that nouns are present values and past-participles
 * are accumulative.
 *
 * @property {bigint} walletsProvisioned  count of new wallets provisioned
 * @property {Amount<'nat'>} totalMintedProvided  running sum of Minted provided to new wallets
 * @property {Amount<'nat'>} totalMintedConverted  running sum of Minted
 * ever received by the contract from PSM
 */

/**
 * Given attenuated access to the funding purse,
 * handle requests to provision smart wallets.
 *
 * @param {(address: string, depositBank: ERef<Bank>) => Promise<void>} sendInitialPayment
 * @param {(count: bigint) => void} publishMetrics
 * @typedef {import('./vat-bank.js').Bank} Bank
 */
const makeBridgeProvisionTool = (sendInitialPayment, publishMetrics) => {
  let provisionedCount = 0n;

  /**
   * @param {{
   *   bankManager: ERef<BankManager>,
   *   namesByAddressAdmin: ERef<NameAdmin>,
   *   walletFactory: ERef<import('@agoric/vats/src/core/startWalletFactory').WalletFactoryStartResult['creatorFacet']>
   * }} io
   */
  const makeHandler = ({ bankManager, namesByAddressAdmin, walletFactory }) =>
    Far('provisioningHandler', {
      fromBridge: async (_srcID, obj) => {
        assert.equal(
          obj.type,
          'PLEASE_PROVISION',
          X`Unrecognized request ${obj.type}`,
        );
        console.info('PLEASE_PROVISION', obj);
        const { address, powerFlags } = obj;
        assert(
          powerFlags.includes(PowerFlags.SMART_WALLET),
          'missing SMART_WALLET in powerFlags',
        );

        const bank = E(bankManager).getBankForAddress(address);
        await sendInitialPayment(address, bank);
        // only proceed  if we can provide funds

        const { nameHub, myAddressNameAdmin } =
          makeMyAddressNameAdminKit(address);

        await Promise.all([
          E(namesByAddressAdmin).update(address, nameHub, myAddressNameAdmin),
          E(walletFactory).provideSmartWallet(
            address,
            bank,
            myAddressNameAdmin,
          ),
        ]);
        provisionedCount += 1n;
        publishMetrics(provisionedCount);
        console.info('provisioned', address, powerFlags);
      },
    });
  return makeHandler;
};

/**
 * @typedef {StandardTerms & GovernanceTerms<{
 *    PerAccountInitialAmount: 'amount',
 *   }> &{
 *   perAccountInitialAmount: Amount<'nat'>,
 * }} ProvisionTerms
 *
 * TODO: ERef<GovernedCreatorFacet<ProvisionCreator>>
 *
 * @param {ZCF<ProvisionTerms>} zcf
 * @param {{
 *   poolBank: import('@endo/far').FarRef<Bank>,
 *   initialPoserInvitation: Invitation,
 *  storageNode: StorageNode,
 *  marshaller: Marshaller
 * }} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  fit(privateArgs, privateArgsShape, 'provisionPool privateArgs');
  const { poolBank } = privateArgs;

  // Governance
  const { publicMixin, creatorMixin, makeFarGovernorFacet, params } =
    await handleParamGovernance(
      zcf,
      privateArgs.initialPoserInvitation,
      {
        PerAccountInitialAmount: ParamTypes.AMOUNT,
      },
      privateArgs.storageNode,
      privateArgs.marshaller,
    );

  const { brand: poolBrand } = params.getPerAccountInitialAmount();
  /** @type {ERef<Purse>} */
  // @ts-expect-error vbank purse is close enough for our use.
  const fundPurse = E(poolBank).getPurse(poolBrand);

  // Metrics
  let totalMintedProvided = AmountMath.makeEmpty(poolBrand);
  let totalMintedConverted = AmountMath.makeEmpty(poolBrand);
  /** @type {import('@agoric/inter-protocol/src/contractSupport.js').MetricsPublishKit<MetricsNotification>} */
  const { metricsPublisher, metricsSubscriber } = makeMetricsPublishKit(
    privateArgs.storageNode,
    privateArgs.marshaller,
  );
  const updateMetrics = walletsProvisioned => {
    metricsPublisher.publish(
      harden({
        walletsProvisioned,
        totalMintedProvided,
        totalMintedConverted,
      }),
    );
  };
  updateMetrics(0n);

  const zoe = zcf.getZoeService();
  const swap = async (payIn, amount, instance) => {
    const psmPub = E(zoe).getPublicFacet(instance);
    const proposal = harden({ give: { In: amount } });
    const invitation = E(psmPub).makeWantMintedInvitation();
    const seat = E(zoe).offer(invitation, proposal, { In: payIn });
    const payout = await E(seat).getPayout('Out');
    const rxd = await E(fundPurse).deposit(payout);
    totalMintedConverted = AmountMath.add(totalMintedConverted, rxd);
    return rxd;
  };

  /** @type {MapStore<Brand, Instance>} */
  const brandToPSM = makeScalarMapStore();

  observeIteration(E(poolBank).getAssetSubscription(), {
    updateState: async desc => {
      console.log('provisionPool notified of new asset', desc.brand);
      await zcf.saveIssuer(desc.issuer, desc.issuerName);
      /** @type {ERef<Purse>} */
      // @ts-expect-error vbank purse is close enough for our use.
      const exchangePurse = E(poolBank).getPurse(desc.brand);
      observeNotifier(E(exchangePurse).getCurrentAmountNotifier(), {
        updateState: async amount => {
          console.log('provisionPool balance update', amount);
          if (AmountMath.isEmpty(amount) || amount.brand === poolBrand) {
            return;
          }
          if (!brandToPSM.has(desc.brand)) {
            console.error('funds arrived but no PSM instance', desc.brand);
            return;
          }
          const instance = brandToPSM.get(desc.brand);
          const payment = E(exchangePurse).withdraw(amount);
          await swap(payment, amount, instance).catch(async reason => {
            console.error(X`swap failed: ${reason}`);
            const resolvedPayment = await payment;
            E(exchangePurse).deposit(resolvedPayment);
          });
        },
        fail: reason => console.error(reason),
      });
    },
  });

  /**
   *
   * @param {string} address
   * @param {ERef<Bank>} destBank
   */
  const sendInitialPayment = async (address, destBank) => {
    console.log('sendInitialPayment', address);
    const perAccountInitialAmount = params.getPerAccountInitialAmount();
    const initialPmt = await E(fundPurse).withdraw(perAccountInitialAmount);

    const destPurse = E(destBank).getPurse(poolBrand);
    return E(destPurse)
      .deposit(initialPmt)
      .then(amt => {
        totalMintedProvided = AmountMath.add(
          totalMintedProvided,
          perAccountInitialAmount,
        );
        console.log('provisionPool sent', amt, 'to', address);
      })
      .catch(reason => {
        console.error(
          X`initial deposit for ${q(address)} failed: ${q(reason)}`,
        );
        void E(fundPurse).deposit(initialPmt);
        throw reason;
      });
  };

  // For documentation and/or future upgrade to Far
  // const ProvisionI = M.interface('ProvisionPool', {
  //   getMetrics: M.call().returns(M.remotable('MetricsSubscriber')),
  //   ...publicMixinAPI,
  // });
  const publicFacet = makeHeapFarInstance(
    'Provisioning Pool public',
    M.interface('ProvisionPool', {
      getMetrics: M.call().returns(M.remotable('MetricsSubscriber')),
      ...publicMixinAPI,
    }),
    {
      getMetrics() {
        return metricsSubscriber;
      },
      ...publicMixin,
    },
  );

  const limitedCreatorFacet = Far('Provisioning Pool creator', {
    makeHandler: makeBridgeProvisionTool(sendInitialPayment, updateMetrics),
    initPSM: (brand, instance) => {
      fit(brand, M.remotable('brand'));
      fit(instance, M.remotable('instance'));
      brandToPSM.init(brand, instance);
    },
    ...creatorMixin,
  });

  return harden({
    creatorFacet: makeFarGovernorFacet(limitedCreatorFacet),
    publicFacet,
  });
};

harden(start);
