import { Fail } from '@endo/errors';
import { mustMatch } from '@endo/patterns';

import { AmountMath, BrandI, PaymentShape } from '@agoric/ertp';
import { AnyNatAmountShape } from '../../typeGuards.js';
import {
  mockIssuerInterfacesPlus,
  PaymentLedgerEntryShape,
  PaymentRecoveryEntryShape,
} from './internal-typeGuards.js';

/**
 * @import {Amplify} from '@endo/exo'
 * @import {Zone} from '@agoric/zone'
 * @import {PaymentLedgerMap} from './internal-types.js'
 */

/**
 * @param {Zone} zone
 */
export const prepareMockIssuerKit = zone => {
  const makeWeakMapStore = zone.detached().weakMapStore;
  const makeSetStore = zone.detached().setStore;

  const {
    IssuerI,
    MintI,
    PaymentI,
    PurseIKit: MockPurseIKitPlus,
  } = mockIssuerInterfacesPlus();

  const mockPayment = zone.exoClass(
    'MockPayment',
    PaymentI,
    brand => ({ brand }),
    {
      getAllegedBrand() {
        return this.state.brand;
      },
    },
  );

  /** @type {Amplify} */
  let purseKitAmp;

  const mockPurseKit = zone.exoClassKit(
    'MockPurse',
    MockPurseIKitPlus,
    (orchAcct, denom, brand, paymentLedger, paymentRecoveryFacets) => {
      const recoverySet = makeSetStore('recoverySet', {
        keyShape: PaymentShape,
      });
      return {
        orchAcct,
        denom,
        brand,
        paymentLedger,
        paymentRecoveryFacets,
        recoverySet,
        currentEncumberedBalance: harden({
          brand,
          value: 0n,
        }),
      };
    },
    {
      purse: {
        getAllegedBrand() {
          return this.state.brand;
        },
        async getCurrentFullBalance() {
          const { orchAcct, denom, brand } = this.state;
          const { value } = await orchAcct.getBalance(denom);
          return harden({ brand, value });
        },
        getCurrentEncumberedBalance() {
          return this.state.currentEncumberedBalance;
        },
        async getCurrentUnencumberedBalance() {
          const { purse } = this.facets;
          const fullBalance = await purse.getCurrentFullBalance();
          const encBalance = purse.getCurrentEncumberedBalance();
          AmountMath.isGTE(fullBalance, encBalance) ||
            Fail`unencumbered balance is negative`;
          return AmountMath.subtract(fullBalance, encBalance);
        },
        // alias for getCurrentUnencumberedBalance
        async getCurrentAmount() {
          return this.facets.purse.getCurrentUnencumberedBalance();
        },
        async getCurrentAmountNotifier() {
          Fail`Mock ertp does not implement amount/balance notifiers`;
        },
        async deposit(_payment, _optAmountShape = undefined) {
          // TODO
        },
        async withdraw(amount) {
          // No overdrawn prevention on withdraw. Only deposit.
          // Surprising, but probably correct!
          const { brand, paymentLedger } = this.state;
          const { recoveryFacet } = this.facets;

          const payment = mockPayment(brand);
          if (!AmountMath.isEmpty(amount)) {
            recoveryFacet.initPayment(payment);
            recoveryFacet.encumber(amount);
          }
          paymentLedger.init(payment, amount);
          return payment;
        },
        getDepositFacet() {
          return this.facets.depositFacet;
        },
        getRecoverySet() {
          return this.state.recoverySet.snapshot();
        },
        recoverAll() {
          const {
            brand,
            recoverySet,
            currentEncumberedBalance: value,
          } = this.state;
          const { recoveryFacet } = this.facets;
          for (const payment of recoverySet.keys()) {
            recoveryFacet.deletePayment(payment);
          }
          this.state.currentEncumberedBalance = harden({
            brand,
            value: 0n,
          });
          return harden({ brand, value });
        },
      },
      depositFacet: {
        async receive(payment, optAmountShape) {
          return this.facets.purse.deposit(payment, optAmountShape);
        },
      },
      recoveryFacet: {
        initPayment(payment) {
          const { paymentRecoveryFacets, recoverySet } = this.state;
          const { recoveryFacet } = this.facets;

          recoverySet.add(payment);
          paymentRecoveryFacets.init(payment, recoveryFacet);
        },
        deletePayment(payment) {
          const { paymentRecoveryFacets, recoverySet } = this.state;

          paymentRecoveryFacets.delete(payment);
          recoverySet.delete(payment);
        },
        getRecoverySetStore() {
          return this.state.recoverySet;
        },
        getCurrentEncumberedBalance() {
          return this.state.currentEncumberedBalance;
        },
        encumber(amount) {
          const { currentEncumberedBalance: oldEncBalance } = this.state;
          this.state.currentEncumberedBalance = AmountMath.add(
            oldEncBalance,
            amount,
          );
        },
        unencumber(amount) {
          const { currentEncumberedBalance: oldEncBalance } = this.state;
          this.state.currentEncumberedBalance = AmountMath.subtract(
            oldEncBalance,
            amount,
          );
        },
        getOrchAcct() {
          return this.state.orchAcct;
        },
      },
    },
    {
      receiveAmplifier(a) {
        purseKitAmp = a;
      },
    },
  );

  // @ts-expect-error TS thinks it is used before assigned, which is a hazard
  // TS is correct to bring to our attention, since there is not enough static
  // into to infer otherwise.
  assert(purseKitAmp !== undefined);

  const mockIssuerKit = zone.exoClassKit(
    'MockIssuerKit',
    {
      brand: BrandI,
      issuer: IssuerI,
      mint: MintI,
    },
    (orchAcct, denom) => {
      // TODO The issuerKit should not be associated with an orchAcct
      /** @type {PaymentLedgerMap} */
      const paymentLedger = makeWeakMapStore(
        'paymentLedger',
        PaymentLedgerEntryShape,
      );
      const paymentRecoveryFacets = makeWeakMapStore(
        'paymentRecoverFacets',
        PaymentRecoveryEntryShape,
      );
      return {
        orchAcct,
        denom,
        paymentLedger,
        paymentRecoveryFacets,
      };
    },
    {
      brand: {
        isMyIssuer(allegedIssuer) {
          return this.facets.issuer === allegedIssuer;
        },
        getAllegedName() {
          return this.state.denom;
        },
        getAmountShape() {
          return AnyNatAmountShape;
        },
      },
      issuer: {
        getBrand() {
          return this.facets.brand;
        },
        getAllegedName() {
          return this.state.denom;
        },
        getAssetKind() {
          return 'nat';
        },
        getDisplayInfo() {
          Fail`mock ertp does not implement deprecated getDisplayInfo`;
        },
        makeEmptyPurse() {
          // TODO each purse should somehow be associated with its own explicit
          // orchAcct
          const { orchAcct, denom, paymentLedger, paymentRecoveryFacets } =
            this.state;
          const { brand } = this.facets;
          const { purse } = mockPurseKit(
            orchAcct,
            denom,
            brand,
            paymentLedger,
            paymentRecoveryFacets,
          );
          return purse;
        },
        isLive(payment) {
          return this.state.paymentLedger.has(payment);
        },
        getAmountOf(payment) {
          return this.state.paymentLedger.get(payment);
        },
        burn(payment, optAmountShape = undefined) {
          const { paymentLedger, paymentRecoveryFacets } = this.state;

          const amount = paymentLedger.get(payment);
          if (optAmountShape !== undefined) {
            mustMatch(amount, optAmountShape);
          }
          if (paymentRecoveryFacets.has(payment)) {
            const paymentRecoveryFacet = paymentRecoveryFacets.get(payment);
            paymentRecoveryFacet.unencumber(amount);
            paymentRecoveryFacet.deletePayment(payment);
            // TODO must all burn the same orch denom assets
            // so the fullBalance goes down and the unencumbered balance
            // eventually stays the same.
            // Without this, the unencumbered balance will go up, which is
            // completely broken.
          }
        },
      },
      mint: {
        getIssuer() {
          return this.facets.issuer;
        },
        mintPayment(newAmount) {
          // The mock implementation has no mintRecoveryPurse or any recovery
          // facet associated with minted payments.
          const { paymentLedger } = this.state;
          const payment = mockPayment(newAmount.brand);
          paymentLedger.init(payment, newAmount);
          return payment;
        },
      },
    },
  );
  return mockIssuerKit;
};
harden(prepareMockIssuerKit);
