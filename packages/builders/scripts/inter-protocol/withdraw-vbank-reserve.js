/* global E */
/// <reference types="@agoric/vats/src/core/core-eval-env.js" />
// @ts-check

/**
 * @import {ChainBootstrapSpace} from '@agoric/vats/src/core/types.js';
 * @import {BootstrapPowers} from '@agoric/vats/src/core/types.js';
 */

// FIXME: we need to hardcode these values because the vbank reserve purse
// balance is not synced.
const DEFAULT_BLD_VALUE = 1_998n;
const DEFAULT_IST_VALUE = 202_020n;

const vbankReserveAddress = 'agoric1ae0lmtzlgrcnla9xjkpaarq5d5dfez63h3nucl';
const beneficiaryAddress = 'agoric18lfz3w97u72p4jq58gdn05ftdcv9rwz0ft5l2m';

/** @param {ChainBootstrapSpace & BootstrapPowers} powers */
const coreEval = async powers => {
  console.warn('Core eval to transfer vbank/reserve to a beneficiary');
  const {
    consume: { agoricNames, bankManager },
  } = powers;

  console.warn('Looking up brands');
  const BLD = await E(agoricNames).lookup('brand', 'BLD');
  const IST = await E(agoricNames).lookup('brand', 'IST');

  console.warn('Getting banks');
  const reserveBank =
    await E(bankManager).getBankForAddress(vbankReserveAddress);
  const beneficiaryBank =
    await E(bankManager).getBankForAddress(beneficiaryAddress);

  console.warn('Getting reserve purses');
  const reserveBLDPurse = await E(reserveBank).getPurse(BLD);
  const reserveISTPurse = await E(reserveBank).getPurse(IST);

  console.warn('Getting reserve balances');
  const BLDAmount = await E(reserveBLDPurse).getCurrentAmount();
  const reserveBLDBalance = harden({
    ...BLDAmount,
    value: BLDAmount.value || DEFAULT_BLD_VALUE,
  });
  const ISTAmount = await E(reserveISTPurse).getCurrentAmount();
  const reserveISTBalance = harden({
    ...ISTAmount,
    value: ISTAmount.value || DEFAULT_IST_VALUE,
  });
  console.warn('reserve BLD balance', reserveBLDBalance);
  console.warn('reserve IST balance', reserveISTBalance);

  console.warn('Getting beneficiary purses');
  const beneficiaryBLDPurse = await E(beneficiaryBank).getPurse(BLD);
  const beneficiaryISTPurse = await E(beneficiaryBank).getPurse(IST);

  console.warn('Withdrawing from reserve purses');
  const BLDPayment = await E(reserveBLDPurse).withdraw(reserveBLDBalance);
  const ISTPayment = await E(reserveISTPurse).withdraw(reserveISTBalance);

  console.warn('Depositing into beneficiary purses');
  const BLDTransferAmount = await E(beneficiaryBLDPurse).deposit(BLDPayment);
  const ISTTransferAmount = await E(beneficiaryISTPurse).deposit(ISTPayment);

  console.warn(
    'Done withdrawing reserve!',
    BLDTransferAmount,
    ISTTransferAmount,
  );
};

coreEval;
