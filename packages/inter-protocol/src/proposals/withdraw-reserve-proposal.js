import { E } from '@endo/far';
import { makeTracer } from '@agoric/internal/src/debug.js';
import { reserveThenDeposit } from './utils.js';

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     reserveKit: Promise<
 *       ReturnType<import('../reserve/assetReserve.js')['start']>
 *     >;
 *   };
 * }} powers
 * @param {{ options: { address: string; count?: number } }} namedArgs
 */
export const inviteReserveWithdrawer = async (
  { consume: { namesByAddressAdmin, reserveKit } },
  { options: { address, count = 1 } },
) => {
  const trace = makeTracer('InviteReserveWithdrawer');

  const maybeGovernedCreatorFacetP = E.get(reserveKit).creatorFacet;
  const creatorFacetP = E(maybeGovernedCreatorFacetP)
    .getLimitedCreatorFacet()
    .catch(err => {
      trace('Failed to get limited creator facet:', err);
      return maybeGovernedCreatorFacetP;
    });

  const makeInvitation = () =>
    // @ts-expect-error tolerate translation from governed to limited creatorFacet
    E(creatorFacetP).makeSingleWithdrawalInvitation();

  const invitations = await Promise.all(
    Array.from({ length: count }, makeInvitation),
  );

  // Deposit the invitations, but don't block in case the address does not yet
  // have a smart wallet.
  for (const invitation of invitations) {
    void reserveThenDeposit(
      `reserve withdrawer ${address}`,
      namesByAddressAdmin,
      address,
      [invitation],
    );
  }
};
harden(inviteReserveWithdrawer);

export const getManifestForInviteWithdrawer = async (
  { restoreRef: _ },
  { address, count },
) => {
  return {
    manifest: {
      [inviteReserveWithdrawer.name]: /** @type {const} */ ({
        consume: {
          namesByAddressAdmin: true,
          economicCommitteeCreatorFacet: true,
        },
      }),
    },
    options: { address, count },
  };
};
