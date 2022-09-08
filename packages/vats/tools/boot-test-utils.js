// @ts-check
import {
  makeFakeVatAdmin,
  zcfBundleCap,
} from '@agoric/zoe/tools/fakeVatAdmin.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { Far } from '@endo/marshal';
import { devices } from '../test/devices.js';

import { buildRootObject as bankRoot } from '../src/vat-bank.js';
import { buildRootObject as boardRoot } from '../src/vat-board.js';
import { buildRootObject as ibcRoot } from '../src/vat-ibc.js';
import { buildRootObject as mintsRoot } from '../src/vat-mints.js';
import { buildRootObject as networkRoot } from '../src/vat-network.js';
import { buildRootObject as priceAuthorityRoot } from '../src/vat-priceAuthority.js';
import { buildRootObject as provisioningRoot } from '../src/vat-provisioning.js';
import { buildRootObject as zoeRoot } from '../src/vat-zoe.js';

export const vatRoots = {
  bank: bankRoot,
  board: boardRoot,
  ibc: ibcRoot,
  mints: mintsRoot,
  network: networkRoot,
  priceAuthority: priceAuthorityRoot,
  provisioning: provisioningRoot,
  zoe: zoeRoot,
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

export const mockSwingsetVats = mock => {
  const { admin: fakeVatAdmin } = makeFakeVatAdmin(() => {});
  const fakeBundleCaps = new Map(); // {} -> name
  const getNamedBundleCap = name => {
    const bundleCap = harden({});
    fakeBundleCaps.set(bundleCap, name);
    return bundleCap;
  };

  const createVat = (bundleCap, options) => {
    const name = fakeBundleCaps.get(bundleCap);
    assert(name);
    switch (name) {
      case 'zcf':
        return fakeVatAdmin.createVat(zcfBundleCap, options);
      default: {
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
        return { root: buildRoot({}, vatParameters), admin: {} };
      }
    }
  };
  const createVatByName = name => {
    const bundleCap = getNamedBundleCap(name);
    return createVat(bundleCap);
  };

  const criticalVatKey = harden({});
  const vats = {
    ...mock.vats,
    vatAdmin: /** @type { any } */ ({
      getCriticalVatKey: () => criticalVatKey,
      createVatAdminService: () =>
        Far('vatAdminSvc', { getNamedBundleCap, createVat, createVatByName }),
    }),
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
