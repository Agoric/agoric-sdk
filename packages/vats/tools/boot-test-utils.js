// @ts-check
import {
  makeFakeVatAdmin,
  zcfBundleCap,
} from '@agoric/zoe/tools/fakeVatAdmin.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { Far } from '@endo/marshal';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { bundles, devices } from '../test/devices.js';

import { buildRootObject as bankRoot } from '../src/vat-bank.js';
import { buildRootObject as boardRoot } from '../src/vat-board.js';
import { buildRootObject as ibcRoot } from '../src/vat-ibc.js';
import { buildRootObject as mintsRoot } from '../src/vat-mints.js';
import { buildRootObject as networkRoot } from '../src/vat-network.js';
import { buildRootObject as priceAuthorityRoot } from '../src/vat-priceAuthority.js';
import { buildRootObject as provisioningRoot } from '../src/vat-provisioning.js';
import { buildRootObject as zoeRoot } from '../src/vat-zoe.js';
// TODO: import { buildRootObject as chainStorageRoot } from '../src/vat-chainStorage.js';

const { Fail } = assert;

export const vatRoots = {
  bank: bankRoot,
  board: boardRoot,
  ibc: ibcRoot,
  mints: mintsRoot,
  network: networkRoot,
  priceAuthority: priceAuthorityRoot,
  provisioning: provisioningRoot,
  zoe: zoeRoot,
  // TODO: chainStorage: chainStorageRoot,
};

export const noop = () => {};

/** @type {DProxy} */
// @ts-expect-error cast
export const mockDProxy = d => d;

export const makeMock = log =>
  harden({
    devices: {
      command: /** @type { any } */ ({ registerInboundHandler: noop }),
      mailbox: /** @type { any } */ ({
        registerInboundHandler: noop,
      }),
      timer: /** @type { any } */ ({}),
      plugin: /** @type { any } */ ({ registerReceiver: noop }),
      ...devices,
    },
    vats: {
      vattp: /** @type { any } */ (
        Far('vattp', {
          registerMailboxDevice: noop,
          addRemote: () => harden({}),
        })
      ),
      comms: Far('comms', {
        addRemote: noop,
        addEgress: noop,
        addIngress: async () =>
          harden({
            getConfiguration: () => harden({ _: 'client configuration' }),
          }),
      }),
      http: { setPresences: noop, setCommandDevice: noop },
      spawner: {
        buildSpawner: () => harden({ _: 'spawner' }),
      },
      timer: Far('TimerVat', {
        createTimerService: async () => buildManualTimer(log),
      }),
      uploads: { getUploads: () => harden({ _: 'uploads' }) },

      network: Far('network', {
        registerProtocolHandler: noop,
        bind: () => harden({ addListener: noop }),
      }),
    },
  });

export const makePopulatedFakeVatAdmin = () => {
  // The .createVat() from zoe/tools/fakeVatAdmin.js only knows how to
  // make ZCF vats, so wrap it in a form that can create the other
  // vats too. We have two types.

  const fakeCapToName = new Map(); // cap -> name
  const fakeNameToCap = new Map(); // name -> cap
  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  for (const name of Object.getOwnPropertyNames(vatRoots)) {
    // These don't have real bundles (just a buildRootObject
    // function), but fakeVatAdmin wants to see a bundle.endoZipBase64
    // hash, so make some fake ones.
    const id = `id-${name}`; // fake bundleID
    const bundle = { endoZipBase64: id };
    const cap = vatAdminState.installNamedBundle(name, id, bundle);
    fakeCapToName.set(cap, name);
    fakeNameToCap.set(name, cap);
  }

  for (const [name, bundle] of Object.entries(bundles)) {
    // These *do* have real bundles, with an ID and everything.
    const id = bundle.endoZipBase64Sha512;
    const cap = vatAdminState.installNamedBundle(name, id, bundle);
    fakeCapToName.set(cap, name);
    fakeNameToCap.set(name, cap);
  }

  const createVat = (bundleCap, options) => {
    if (!bundleCap) {
      throw Error('falsy bundleCap!');
    }
    if (bundleCap === zcfBundleCap) {
      return fakeVatAdmin.createVat(zcfBundleCap, options);
    }
    const name = fakeCapToName.get(bundleCap);
    assert(name);
    const buildRoot = vatRoots[name];
    if (!buildRoot) {
      throw Error(`TODO: load vat ${name}`);
    }
    const vatParameters = { ...options?.vatParameters };
    if (name === 'zoe') {
      // basic-behaviors.js:buildZoe() provides hard-coded zcf BundleName
      // and vat-zoe.js ignores vatParameters, but this would be the
      // preferred way to pass the name.
      vatParameters.zcfBundleName = 'zcf';
    }
    const baggage = makeScalarBigMapStore('baggage');
    const adminNode =
      /** @type {import('@agoric/swingset-vat').VatAdminFacet} */ ({});
    return { root: buildRoot({}, vatParameters, baggage), adminNode };
  };
  const createVatByName = name => {
    return createVat(
      fakeNameToCap.get(name) ||
        Fail`bad bundle name: ${name}, ${[...fakeNameToCap.keys()]}`,
    );
  };

  const vatAdminService = Far('vatAdminSvc', {
    ...fakeVatAdmin,
    createVat,
    createVatByName,
  });
  const criticalVatKey = vatAdminState.getCriticalVatKey();
  const getCriticalVatKey = () => criticalVatKey;
  const createVatAdminService = () => vatAdminService;
  /** @type { any } */
  const vatAdminRoot = { getCriticalVatKey, createVatAdminService };
  return { vatAdminService, vatAdminRoot };
};

export const mockSwingsetVats = mock => {
  const { vatAdminRoot } = makePopulatedFakeVatAdmin();
  const vats = {
    ...mock.vats,
    vatAdmin: vatAdminRoot,
  };
  return vats;
};

/**
 *
 * @param {(msg: string) => void} log
 */
export const mockPsmBootstrapArgs = log => {
  const mock = makeMock(log);
  const vats = mockSwingsetVats(mock);
  return [vats, mock.devices];
};
