import harden from '@agoric/harden';
import Nat from '@agoric/nat';

// Vats are identified by an integer index, which (for typechecking purposes)
// is encoded as `vNN`. Devices are similarly identified as `dNN`. Both have
// human-readable names, which are provided to controller.addGenesisVat(),
// and usually come from the `vat-NAME.js` filenames processed in
// loadBasedir(). These names also appear in the `vats` and `devices`
// arguments to the bootstrap Vat's `bootstrap()` function, and in debug
// messages.

export function insistVatID(s) {
  try {
    if (s !== `${s}`) {
      throw new Error(`not a string`);
    }
    s = `${s}`;
    if (!s.startsWith(`v`)) {
      throw new Error(`does not start with 'v'`);
    }
    Nat(Number(s.slice(1)));
  } catch (e) {
    throw new Error(`'${s} is not a 'vNN'-style VatID: ${e.message}`);
  }
}

export function makeVatID(index) {
  return `v${Nat(index)}`;
}

export function insistDeviceID(s) {
  try {
    if (s !== `${s}`) {
      throw new Error(`not a string`);
    }
    s = `${s}`;
    if (!s.startsWith(`d`)) {
      throw new Error(`does not start with 'd'`);
    }
    Nat(Number(s.slice(1)));
  } catch (e) {
    throw new Error(`'${s} is not a 'dNN'-style DeviceID: ${e.message}`);
  }
}

export function makeDeviceID(index) {
  return `d${Nat(index)}`;
}

export function parseVatOrDeviceID(s) {
  if (s !== `${s}`) {
    throw new Error(`${s} is not a string, so cannot be a VatID/DevieID`);
  }
  s = `${s}`;
  let type;
  let idSuffix;
  if (s.startsWith('v')) {
    type = 'vat';
    idSuffix = s.slice(1);
  } else if (s.startsWith('v')) {
    type = 'device';
    idSuffix = s.slice(1);
  } else {
    throw new Error(`'${s}' is neither a VatID nor a DeviceID`);
  }
  return harden({ type, id: Nat(Number(idSuffix)) });
}
