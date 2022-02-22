// @ts-check
import { makeNotifierKit } from '@agoric/notifier';
import '@agoric/zoe/exported.js';
import { Far } from '@endo/marshal';

const { details: X } = assert;

/**
 *
 * @param {InnerVault | null} inner
 */
const makeOuterKit = inner => {
  const { updater: uiUpdater, notifier } = makeNotifierKit();

  const assertActive = v => {
    assert(inner, X`Using ${v} after transfer`);
    return inner;
  };
  /** @type {Vault} */
  const vault = Far('vault', {
    getNotifier: () => notifier,
    makeAdjustBalancesInvitation: () =>
      assertActive(vault).makeAdjustBalancesInvitation(),
    makeCloseInvitation: () => assertActive(vault).makeCloseInvitation(),
    makeTransferInvitation: () => {
      const tmpInner = assertActive(vault);
      inner = null;
      return tmpInner.makeTransferInvitation();
    },
    // for status/debugging
    getCollateralAmount: () => assertActive(vault).getCollateralAmount(),
    getDebtAmount: () => assertActive(vault).getDebtAmount(),
    getNormalizedDebt: () => assertActive(vault).getNormalizedDebt(),
    getLiquidationSeat: () => assertActive(vault).getLiquidationSeat(),
  });
  return { vault, uiUpdater };
};

/**
 *
 * @param {InnerVault} inner
 */
export const setupOuter = inner => {
  const { vault, uiUpdater: updater } = makeOuterKit(inner);
  const transferInvitationHook = {
    uiNotifier: vault.getNotifier(),
    invitationMakers: Far('invitation makers', {
      AdjustBalances: vault.makeAdjustBalancesInvitation,
      CloseVault: vault.makeCloseInvitation,
      TransferVault: vault.makeTransferInvitation,
    }),
    vault,
  };
  return harden({ transferInvitationHook, updater });
};

/**
 * @typedef {(ReturnType<typeof setupOuter>)['transferInvitationHook']} TransferInvitationHook
 */
