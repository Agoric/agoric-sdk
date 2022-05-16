import { E } from '@endo/far';

// must match packages/wallet/api/src/lib-wallet.js
export const DEPOSIT_FACET = 'depositFacet';

const { details: X } = assert;

/**
 * @param {ERef<NameAdmin>} nameAdmin
 * @param {string[][]} paths
 */
export const reserveThenGetNamePaths = async (nameAdmin, paths) => {
  /**
   *
   * @param {ERef<NameAdmin>} nextAdmin
   * @param {string[]} path
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
      assert(Array.isArray(path), X`path ${path} is not an array`);
      return nextPath(nameAdmin, path);
    }),
  );
};

/**
 * @param {ERef<NameAdmin>} nameAdmin
 * @param {string[]} names
 */
export const reserveThenGetNames = async (nameAdmin, names) =>
  reserveThenGetNamePaths(
    nameAdmin,
    names.map(name => [name]),
  );

export const reserveThenDeposit = async (
  debugName,
  namesByAddressAdmin,
  addr,
  payments,
) => {
  console.info('waiting for', debugName);
  const [depositFacet] = await reserveThenGetNamePaths(namesByAddressAdmin, [
    [addr, DEPOSIT_FACET],
  ]);
  console.info('depositing to', debugName);
  await Promise.all(payments.map(payment => E(depositFacet).receive(payment)));
  console.info('confirmed deposit for', debugName);
};
