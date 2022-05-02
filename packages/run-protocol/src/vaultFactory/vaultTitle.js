/**
 * @file Object representing ownership of a vault
 */
// @ts-check
import { makeNotifierKit } from '@agoric/notifier';
import { defineKindMulti } from '@agoric/vat-data';
import '@agoric/zoe/exported.js';

const { details: X } = assert;

/**
 * @typedef {{
 * notifier: NotifierRecord<VaultTitleState>['notifier'],
 * updater: NotifierRecord<VaultTitleState>['updater'],
 * vault: Vault | null,
 * }} State
 * @typedef {Readonly<{
 *   state: State,
 *   facets: {
 *     helper: import('@agoric/vat-data/src/types').KindFacet<typeof helper>,
 *     self: import('@agoric/vat-data/src/types').KindFacet<typeof title>,
 *   },
 * }>} MethodContext
 */

/**
 *
 * @param {Vault} vault
 * @returns {State}
 */
const initState = vault => {
  /** @type {NotifierRecord<VaultTitleState>} */
  const { updater, notifier } = makeNotifierKit();

  return { notifier, updater, vault };
};

const helper = {
  /**
   * @param {MethodContext} context
   * @throws if this title no longer owns the vault
   */
  owned: ({ state }) => {
    const { vault } = state;
    assert(vault, X`Using vault title after transfer`);
    return vault;
  },
  /** @param {MethodContext} context */
  getUpdater: ({ state }) => state.updater,
};

const title = {
  /** @param {MethodContext} context */
  getNotifier: ({ state }) => state.notifier,
  /** @param {MethodContext} context */
  makeAdjustBalancesInvitation: ({ facets }) =>
    facets.helper.owned().makeAdjustBalancesInvitation(),
  /** @param {MethodContext} context */
  makeCloseInvitation: ({ facets }) =>
    facets.helper.owned().makeCloseInvitation(),
  /**
   * Starting a transfer revokes the vaultTitle. The associated updater will
   * get a special notification that the vault is being transferred.
   *
   * @param {MethodContext} context
   */
  makeTransferInvitation: ({ state, facets }) => {
    const vault = facets.helper.owned();
    state.vault = null;
    return vault.makeTransferInvitation();
  },
  // for status/debugging
  /** @param {MethodContext} context */
  getCollateralAmount: ({ facets }) =>
    facets.helper.owned().getCollateralAmount(),
  /** @param {MethodContext} context */
  getCurrentDebt: ({ facets }) => facets.helper.owned().getCurrentDebt(),
  /** @param {MethodContext} context */
  getNormalizedDebt: ({ facets }) => facets.helper.owned().getNormalizedDebt(),
};

const behavior = { helper, title };

export const makeVaultTitle = defineKindMulti(
  'VaultTitle',
  initState,
  behavior,
);
