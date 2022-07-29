// @ts-check
/**
 * @typedef {Readonly<{
 *   address: Address,
 *   lienMint: *,
 *   stakeBrand: Brand<'nat'>,
 *   zcf: ZCF,
 * }>} State
 * @typedef {{
 *   state: State,
 * }} MethodContext
 */

import { defineKind } from '@agoric/vat-data';
/**
 * @param {Address} address
 * @param {import('./attestation').LienMint} lienMint
 * @param {Brand<'nat'>} stakeBrand
 * @param {ZCF} zcf
 */
const initState = (address, lienMint, stakeBrand, zcf) => {
  return { address, lienMint, stakeBrand, zcf };
};

const behavior = {
  /**
   * @param {MethodContext} context
   * @param {Amount<'nat'>} lienedDelta
   */
  makeAttestation: ({ state }, lienedDelta) =>
    state.lienMint.mintAttestation(state.address, lienedDelta),

  /** @param {MethodContext} context */
  getAccountState: ({ state }) =>
    state.lienMint.getAccountState(state.address, state.stakeBrand),

  /** @param {MethodContext} context */
  makeReturnAttInvitation: ({ state }) =>
    state.zcf.makeInvitation(
      state.lienMint.returnAttestation,
      'returnAttestation',
    ),

  /**
   * @param {MethodContext} context
   * @param {Amount<'nat'>} lienedAmount
   */
  wrapLienedAmount: ({ state }, lienedAmount) =>
    state.lienMint.wrapLienedAmount(state.address, lienedAmount),

  /**
   * @param {MethodContext} context
   * @param {Amount<'copyBag'>} attAmount
   */
  unwrapLienedAmount: ({ state }, attAmount) =>
    state.lienMint.unwrapLienedAmount(attAmount),
};

/**
 * @returns {AttestationTool}
 */
export const makeAttestationTool = defineKind(
  'AttestationTool',
  initState,
  behavior,
);
