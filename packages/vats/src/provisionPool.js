// @jessie-check
// @ts-check

import { fit, M, makeScalarMapStore } from '@agoric/store';
import { E, Far } from '@endo/far';
// TODO: move to narrower package?
import { observeIteration, observeNotifier } from '@agoric/notifier';
import { AmountMath, AmountShape } from '@agoric/ertp';
import { WalletName } from '@agoric/internal';
import {
  makeMyAddressNameAdminKit,
  PowerFlags,
} from './core/basic-behaviors.js';

const { details: X, quote: q } = assert;

const privateShape = harden({
  poolBank: M.eref(M.remotable('bank')),
});

/**
 * Given attenuated access to the funding purse,
 * handle requests to provision smart wallets.
 *
 * @param {(address: string, depositFacet: ERef<DepositFacet>) => Promise<void>} sendInitialPayment
 */
const makeBridgeProvisionTool = sendInitialPayment => {
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
        assert(namesByAddressAdmin, 'no namesByAddressAdmin');
        assert.equal(
          obj.type,
          'PLEASE_PROVISION',
          X`Unrecognized request ${obj.type}`,
        );
        const { address, powerFlags } = obj;
        console.info('PLEASE_PROVISION', address, powerFlags);

        if (!powerFlags.includes(PowerFlags.SMART_WALLET)) {
          return;
        }

        const { nameHub, myAddressNameAdmin } =
          makeMyAddressNameAdminKit(address);

        const bank = E(bankManager).getBankForAddress(address);
        await Promise.all([
          E(namesByAddressAdmin).update(address, nameHub, myAddressNameAdmin),
          E(walletFactory).provideSmartWallet(
            address,
            bank,
            myAddressNameAdmin,
          ),
          sendInitialPayment(address, nameHub.lookup(WalletName.depositFacet)),
        ]);

        console.info('provisioned', address, powerFlags);
      },
    });
  return makeHandler;
};

/**
 * @typedef {StandardTerms & {
 *   perAccountInitialAmount: Amount<'nat'>,
 * }} ProvisionTerms
 *
 * @param {ZCF<ProvisionTerms>} zcf
 * @param {{
 *   poolBank: import('@endo/far').FarRef<import('./vat-bank.js').Bank>,
 * }} privateArgs
 * @returns
 */
export const start = (zcf, privateArgs) => {
  // TODO: make initial amount governed
  const { perAccountInitialAmount } = zcf.getTerms();
  fit(privateArgs, privateShape, 'provisionPool privateArgs');
  const { poolBank } = privateArgs;
  fit(perAccountInitialAmount, AmountShape, 'perAccountInitialAmount');
  const { brand: poolBrand } = perAccountInitialAmount;
  /** @type {ERef<Purse>} */
  // @ts-expect-error vbank purse is close enough for our use.
  const fundPurse = E(poolBank).getPurse(poolBrand);

  const zoe = zcf.getZoeService();
  const swap = async (payIn, amount, instance) => {
    const psmPub = E(zoe).getPublicFacet(instance);
    const proposal = harden({ give: { In: amount } });
    const invitation = E(psmPub).makeWantMintedInvitation();
    const seat = E(zoe).offer(invitation, proposal, { In: payIn });
    const payout = await E(seat).getPayout('Out');
    return E(fundPurse).deposit(payout);
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

  const sendInitialPayment = async (address, depositFacet) => {
    console.log('sendInitialPayment', address);
    const initialPmt = await E(fundPurse).withdraw(perAccountInitialAmount);

    return E(depositFacet)
      .receive(initialPmt)
      .then(amt => {
        console.log('provisionPool sent', amt, 'to', address);
      })
      .catch(e => {
        console.error(X`initial deposit for ${q(address)} failed: ${q(e)}`);
        E(fundPurse).deposit(initialPmt);
      });
  };

  const creatorFacet = Far('Provisioning Pool creator', {
    makeHandler: makeBridgeProvisionTool(sendInitialPayment),
    initPSM: (brand, instance) => {
      fit(brand, M.remotable('brand'));
      fit(instance, M.remotable('instance'));
      brandToPSM.init(brand, instance);
    },
  });

  return { creatorFacet };
};

harden(start);
