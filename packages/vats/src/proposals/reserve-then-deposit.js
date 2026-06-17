import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import { WalletName } from '@agoric/internal';

/**
 * @import {ERef} from '@endo/far';
 * @import {NameAdmin} from '@agoric/vats';
 * @import {Payment} from '@agoric/ertp';
 */

/**
 * Reserve and look up a list of name paths, waiting for each path segment to be
 * reserved before resolving. Relocated from `@agoric/inter-protocol` (refs
 * #12719); used by the economicCommittee/charter bootstrap proposals.
 *
 * @param {ERef<NameAdmin>} nameAdmin
 * @param {string[][]} paths
 * @returns {Promise<unknown[]>}
 */
export const reserveThenGetNamePaths = async (nameAdmin, paths) => {
  /**
   * @param {ERef<NameAdmin>} nextAdmin
   * @param {string[]} path
   * @returns {Promise<unknown>}
   */
  const nextPath = async (nextAdmin, path) => {
    const [nextName, ...rest] = path;
    assert.typeof(nextName, 'string');

    // Ensure we wait for the next name until it exists.
    await E(nextAdmin).reserve(nextName);

    if (rest.length === 0) {
      // Now return the readonly lookup of the name.
      const nameHub = E(nextAdmin).readonly();
      return E(nameHub).lookup(nextName);
    }

    // Wait until the next admin is resolved.
    const restAdmin = await E(nextAdmin).lookupAdmin(nextName);
    return nextPath(restAdmin, rest);
  };

  return Promise.all(
    paths.map(async path => {
      Array.isArray(path) || Fail`path ${path} is not an array`;
      return nextPath(nameAdmin, path);
    }),
  );
};

/**
 * Deposit payments (e.g. invitations) to an address's deposit facet, reserving
 * the name path first so it resolves once the recipient provisions a wallet.
 *
 * @param {string} debugName
 * @param {ERef<NameAdmin>} namesByAddressAdmin
 * @param {string} addr
 * @param {ERef<Payment>[]} payments
 */
export const reserveThenDeposit = async (
  debugName,
  namesByAddressAdmin,
  addr,
  payments,
) => {
  console.info('awaiting depositFacet for', debugName);
  /** @type {any} */
  const [depositFacet] = await reserveThenGetNamePaths(namesByAddressAdmin, [
    [addr, WalletName.depositFacet],
  ]);
  console.info('depositing to', debugName);
  await Promise.allSettled(
    payments.map(async (paymentP, i) => {
      const payment = await paymentP;
      await E(depositFacet).receive(payment);
      console.info(
        `confirmed deposit ${i + 1}/${payments.length} for`,
        debugName,
      );
    }),
  );
};
