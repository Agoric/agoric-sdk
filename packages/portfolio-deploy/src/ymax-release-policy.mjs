import { createHash } from 'node:crypto';

export const targetInfo = {
  'ymax0-devnet': {
    contract: 'ymax0',
    network: 'devnet',
    chainId: 'agoricdev-25',
  },
  'ymax0-main': {
    contract: 'ymax0',
    network: 'main',
    chainId: 'agoric-3',
  },
  'ymax1-main': {
    contract: 'ymax1',
    network: 'main',
    chainId: 'agoric-3',
  },
};

export const prerequisiteTargets = {
  'ymax0-devnet': [],
  'ymax0-main': ['ymax0-devnet'],
  'ymax1-main': ['ymax0-main'],
};

export const canonicalizePrivateArgs = specimen => {
  const overrides = specimen ? JSON.parse(specimen) : {};
  return `${JSON.stringify(overrides, null, 2)}\n`;
};

export const expectedOverridesAssetName = (target, specimen) => {
  const text = canonicalizePrivateArgs(specimen);
  const digest = createHash('sha256').update(text).digest('hex').slice(0, 12);
  return `${target}-privateArgsOverrides-${digest}.json`;
};

export const bundleIdFromBundleRecord = (
  bundle,
  sourceDescription = 'bundle-ymax0.json',
) => {
  if (!bundle?.endoZipBase64Sha512) {
    throw Error(`${sourceDescription} missing endoZipBase64Sha512`);
  }
  return `b1-${bundle.endoZipBase64Sha512}`;
};

export const bundleIdFromBundleText = (
  text,
  sourceDescription = 'bundle-ymax0.json',
) => bundleIdFromBundleRecord(JSON.parse(text), sourceDescription);

export const validateBaseRecord = (target, bundleId, record) => {
  const expected = {
    target,
    ...targetInfo[target],
    bundleId,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (record[key] !== value) {
      throw Error(`expected ${key}=${value}, got ${String(record[key])}`);
    }
  }
};

export const validateInstallRecord = (target, bundleId, record) => {
  validateBaseRecord(target, bundleId, record);
  if (record.confirmedInBundles === true) return;
  throw Error('confirmedInBundles must be true');
};

export const validateUpgradeRecord = (target, bundleId, record) => {
  validateBaseRecord(target, bundleId, record);
  const hasValidIncarnation = typeof record.incarnationNumber === 'number';
  const hasValidHealthBlocks =
    Array.isArray(record.healthBlocks) && record.healthBlocks.length >= 2;
  const hasOverridesPath = Boolean(record.privateArgsOverridesPath);
  if (hasValidIncarnation && hasValidHealthBlocks && hasOverridesPath) return;
  throw Error('invalid upgrade record');
};
