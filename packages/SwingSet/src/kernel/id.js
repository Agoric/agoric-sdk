import Nat from '@agoric/nat';

// Vats are identified by an integer index, which (for typechecking purposes)
// is encoded as `vNN`. Devices are similarly identified as `dNN`. Both have
// human-readable names, which are provided to controller.addGenesisVat(),
// and usually come from the `vat-NAME.js` filenames processed in
// loadBasedir(). These names also appear in the `vats` and `devices`
// arguments to the bootstrap Vat's `bootstrap()` function, and in debug
// messages.

/**
 * Assert function to ensure that something expected to be a vat ID string
 * actually is one.
 *
 * @param {string} s  The (alleged) string to be tested.
 *
 * @throws {Error} if, upon inspection, the parameter is not a string or is not a
 *    well-formed vat ID as described above.
 *
 * @returns {void}
 */
export function insistVatID(s) {
  try {
    if (s !== `${s}`) {
      throw new Error(`not a string`);
    }
    if (!s.startsWith(`v`)) {
      throw new Error(`does not start with 'v'`);
    }
    Nat(Number(s.slice(1)));
  } catch (e) {
    throw new Error(`'${s} is not a 'vNN'-style VatID: ${e.message}`);
  }
}

/**
 * Generate a vat ID string given an index.
 *
 * @param {number} index  The index.
 *
 * @returns {string} a vat ID string of the form "vNN" where NN is the index.
 */
export function makeVatID(index) {
  return `v${Nat(index)}`;
}

/**
 * Assert function to ensure that something expected to be a device ID string
 * actually is one.
 *
 * @param {string} s  The (alleged) string to be tested.
 *
 * @throws {Error} if, upon inspection, the parameter is not a string or is not a
 *    well-formed device ID as described above.
 *
 * @returns {void}
 */
export function insistDeviceID(s) {
  try {
    if (s !== `${s}`) {
      throw new Error(`not a string`);
    }
    if (!s.startsWith(`d`)) {
      throw new Error(`does not start with 'd'`);
    }
    Nat(Number(s.slice(1)));
  } catch (e) {
    throw new Error(`'${s} is not a 'dNN'-style DeviceID: ${e.message}`);
  }
}

/**
 * Generate a device ID string given an index.
 *
 * @param {number} index  The index.
 *
 * @returns {string} a device ID string of the form "dNN" where NN is the index.
 */
export function makeDeviceID(index) {
  return `d${Nat(index)}`;
}

/**
 * Parse a vat or device ID string into its constituent parts.
 *
 * @param {string} s  The string to be parsed.
 *
 * @returns {{ type: 'vat' | 'device', id: number}} an object: {
 *    type: STRING, // 'vat' or 'device', accordingly
 *    id: Nat       // the index
 *  }
 *
 * @throws {Error} if the parameter is not a string or is malformed.
 */
export function parseVatOrDeviceID(s) {
  if (s !== `${s}`) {
    throw new Error(`${s} is not a string, so cannot be a VatID/DeviceID`);
  }
  s = `${s}`;
  let type;
  let idSuffix;
  if (s.startsWith('v')) {
    type = 'vat';
    idSuffix = s.slice(1);
  } else if (s.startsWith('d')) {
    type = 'device';
    idSuffix = s.slice(1);
  } else {
    throw new Error(`'${s}' is neither a VatID nor a DeviceID`);
  }
  return harden({ type, id: Nat(Number(idSuffix)) });
}
