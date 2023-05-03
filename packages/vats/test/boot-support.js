// @ts-check
import { makeNameHubKit } from '../src/nameHub.js';
import { agoricNamesReserved, makeWellKnownSpaces } from '../src/core/utils.js';

const noop = harden(() => {});

/**
 * Make the well-known agoricNames namespace so that we can
 * E(home.agoricNames).lookup('issuer', 'IST') and likewise
 * for brand, installation, instance, etc.
 *
 * @param {typeof console.log} [log]
 * @param {Record<string, Record<string, unknown>>} reserved a property
 *   for each of issuer, brand, etc. with a value whose keys are names
 *   to reserve.
 *
 * For static typing and integrating with the bootstrap permit system,
 * return { produce, consume } spaces rather than NameAdmins.
 *
 * @deprecated in favor of makeWellKnownSpaces
 *
 * @returns {Promise<{
 *   agoricNames: import('../src/types.js').NameHub,
 *   agoricNamesAdmin: import('../src/types.js').NameAdmin,
 *   spaces: WellKnownSpaces,
 * }>}
 */

export const makeAgoricNamesAccess = async (
  log = noop,
  reserved = agoricNamesReserved,
) => {
  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();
  const provider = { getNameHubKit: () => ({ agoricNames, agoricNamesAdmin }) };
  const spaces = await makeWellKnownSpaces(
    provider,
    log,
    Object.keys(reserved),
  );

  const typedSpaces = /** @type { WellKnownSpaces } */ (
    /** @type {any} */ (spaces)
  );
  return {
    agoricNames,
    agoricNamesAdmin,
    spaces: typedSpaces,
  };
};
