/** @import { InstallRecord, PendingUpgradeRecord, Target, UpgradeRecord } from '../scripts/ymax-deploy-target.ts' */

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

/** @param {string | undefined} specimen */
export const canonicalizePrivateArgs = specimen => {
  const overrides = specimen ? JSON.parse(specimen) : {};
  return `${JSON.stringify(overrides, null, 2)}\n`;
};

/**
 * @param {Target} target
 * @param {string | undefined} specimen
 */
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

const validateBaseRecord = (target, bundleId, record) => {
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

const validateInstallRecord = (target, bundleId, record) => {
  validateBaseRecord(target, bundleId, record);
  if (record.confirmedInBundles === true) return;
  throw Error('confirmedInBundles must be true');
};

const validateUpgradeRecord = (target, bundleId, record) => {
  validateBaseRecord(target, bundleId, record);
  const hasValidIncarnation = typeof record.incarnationNumber === 'number';
  const hasValidHealthBlocks =
    Array.isArray(record.healthBlocks) && record.healthBlocks.length >= 2;
  const hasOverridesPath = Boolean(record.privateArgsOverridesPath);
  if (hasValidIncarnation && hasValidHealthBlocks && hasOverridesPath) return;
  throw Error('invalid upgrade record');
};

/**
 * @param {Target} target
 * @param {string} bundleId
 * @param {PendingUpgradeRecord} record
 * @param {string | undefined} [expectedReleaseTag]
 */
const validatePendingUpgradeRecord = (
  target,
  bundleId,
  record,
  expectedReleaseTag,
) => {
  validateBaseRecord(target, bundleId, record);
  const hasReleaseTag = Boolean(record.releaseTag);
  const hasInvocationId = Boolean(record.invocationId);
  const hasOverridesPath = Boolean(record.privateArgsOverridesPath);
  const hasSubmitTime = Boolean(record.submitTime);
  if (hasReleaseTag && hasInvocationId && hasOverridesPath && hasSubmitTime) {
    if (
      expectedReleaseTag === undefined ||
      record.releaseTag === expectedReleaseTag
    ) {
      return;
    }
    throw Error(
      `expected releaseTag=${expectedReleaseTag}, got ${String(record.releaseTag)}`,
    );
  }
  throw Error('invalid pending upgrade record');
};

/**
 * @param {Set<string>} assetNames
 * @param {string} assetName
 */
export const requireAsset = (assetNames, assetName) => {
  if (assetNames.has(assetName)) return;
  throw Error(`missing required release asset ${assetName}`);
};

/**
 * @param {string} assetName
 * @param {Target} target
 * @param {string | undefined} specimen
 * @param {{ privateArgsOverridesPath: string }} record
 */
export const validateExpectedOverridesAsset = (
  assetName,
  target,
  specimen,
  record,
) => {
  const expected = expectedOverridesAssetName(target, specimen);
  if (record.privateArgsOverridesPath === expected) return;
  throw Error(
    `existing ${assetName} uses ${record.privateArgsOverridesPath}, not ${expected}; remove or rename ${assetName} to change private args`,
  );
};

/**
 * @param {Set<string>} assetNames
 * @param {Target} target
 * @param {string} bundleId
 * @param {InstallRecord} record
 */
export const validateNamedInstallRecord = (
  assetNames,
  target,
  bundleId,
  record,
) => {
  requireAsset(assetNames, `${target}-install.json`);
  validateInstallRecord(target, bundleId, record);
};

/**
 * @param {Set<string>} assetNames
 * @param {Target} target
 * @param {string} bundleId
 * @param {UpgradeRecord} record
 * @param {string | undefined} [privateArgs]
 */
export const validateNamedUpgradeRecord = (
  assetNames,
  target,
  bundleId,
  record,
  privateArgs,
) => {
  const assetName = `${target}-upgrade.json`;
  requireAsset(assetNames, assetName);
  validateUpgradeRecord(target, bundleId, record);
  if (privateArgs !== undefined) {
    validateExpectedOverridesAsset(assetName, target, privateArgs, record);
  }
};

/**
 * @param {Set<string>} assetNames
 * @param {Target} target
 * @param {string} bundleId
 * @param {PendingUpgradeRecord} record
 * @param {string | undefined} privateArgs
 * @param {string | undefined} [expectedReleaseTag]
 */
export const validateNamedPendingUpgradeRecord = (
  assetNames,
  target,
  bundleId,
  record,
  privateArgs,
  expectedReleaseTag,
) => {
  const assetName = `${target}-upgrade-pending.json`;
  requireAsset(assetNames, assetName);
  validatePendingUpgradeRecord(target, bundleId, record, expectedReleaseTag);
  validateExpectedOverridesAsset(assetName, target, privateArgs, record);
};

/**
 * @typedef {{
 *   assetNames: Set<string>;
 *   getAssetJson: (name: string) => unknown;
 *   getAssetText: (name: string) => string;
 *   release: { url?: string };
 * }} ReleasePlanReader
 */

/**
 * @typedef {{
 *   bundleIdArg: string;
 *   mode: string;
 *   privateArgs: string;
 *   reader: ReleasePlanReader;
 *   releaseTag: string;
 *   target: Target;
 *   ymax1Planner: string;
 * }} ReleasePlanOptions
 */

const validatePrerequisites = ({ assetNames, getAssetJson }, target, bundleId) => {
  for (const priorTarget of prerequisiteTargets[target]) {
    validateNamedInstallRecord(
      assetNames,
      priorTarget,
      bundleId,
      /** @type {InstallRecord} */ (getAssetJson(`${priorTarget}-install.json`)),
    );
    validateNamedUpgradeRecord(
      assetNames,
      priorTarget,
      bundleId,
      /** @type {UpgradeRecord} */ (getAssetJson(`${priorTarget}-upgrade.json`)),
    );
  }
};

const planPreUpgrade = ({ assetNames, getAssetJson }, target, bundleId) => {
  const installAssetName = `${target}-install.json`;
  if (!assetNames.has(installAssetName)) {
    return { needPreUpgrade: true };
  }
  validateNamedInstallRecord(
    assetNames,
    target,
    bundleId,
    /** @type {InstallRecord} */ (getAssetJson(installAssetName)),
  );
  return { needPreUpgrade: false };
};

const planUpgrade = (
  { assetNames, getAssetJson },
  target,
  bundleId,
  privateArgs,
  releaseTag,
) => {
  const upgradeAssetName = `${target}-upgrade.json`;
  if (assetNames.has(upgradeAssetName)) {
    validateNamedUpgradeRecord(
      assetNames,
      target,
      bundleId,
      /** @type {UpgradeRecord} */ (getAssetJson(upgradeAssetName)),
      privateArgs,
    );
    return {
      needUpgradeSubmit: false,
      needUpgradeConfirm: false,
    };
  }

  const pendingAssetName = `${target}-upgrade-pending.json`;
  if (!assetNames.has(pendingAssetName)) {
    return {
      needUpgradeSubmit: true,
      needUpgradeConfirm: true,
    };
  }
  validateNamedPendingUpgradeRecord(
    assetNames,
    target,
    bundleId,
    /** @type {PendingUpgradeRecord} */ (getAssetJson(pendingAssetName)),
    privateArgs,
    releaseTag,
  );
  return {
    needUpgradeSubmit: false,
    needUpgradeConfirm: true,
  };
};

/**
 * @param {ReleasePlanOptions} options
 */
export const makeReleasePlan = ({
  bundleIdArg,
  mode,
  privateArgs,
  reader,
  releaseTag,
  target,
  ymax1Planner,
}) => {
  if (!(target in targetInfo)) throw Error(`unsupported target: ${target}`);
  if (!['bundle-only', 'deploy'].includes(mode)) {
    throw Error(`unsupported --mode: ${mode}`);
  }

  const { assetNames, getAssetText, release } = reader;
  const needBundleBuild =
    target === 'ymax0-devnet' && !assetNames.has('bundle-ymax0.json');
  const bundleId =
    bundleIdArg ||
    (assetNames.has('bundle-ymax0.json')
      ? bundleIdFromBundleText(getAssetText('bundle-ymax0.json'))
      : '');

  const basePlan = {
    mode,
    target,
    releaseTag,
    releaseExists: Boolean(release.url),
    bundleId,
    needBundleBuild,
    needPreUpgrade: true,
    needUpgradeSubmit: true,
    needUpgradeConfirm: true,
  };

  if (mode === 'bundle-only') {
    return { ...basePlan, needUpgrade: true };
  }

  if (!bundleId) {
    if (!needBundleBuild) {
      throw Error(
        `bundle id unavailable for ${target}; build or upload bundle-ymax0.json first`,
      );
    }
    return {
      ...basePlan,
      needUpgrade: basePlan.needUpgradeSubmit || basePlan.needUpgradeConfirm,
    };
  }

  validatePrerequisites(reader, target, bundleId);
  const plan = {
    ...basePlan,
    ...planPreUpgrade(reader, target, bundleId),
    ...planUpgrade(reader, target, bundleId, privateArgs, releaseTag),
  };

  if (
    target === 'ymax1-main' &&
    (plan.needUpgradeSubmit || plan.needUpgradeConfirm) &&
    ymax1Planner !== 'down'
  ) {
    throw Error('ymax1Planner must be down for ymax1-main');
  }

  return {
    ...plan,
    needUpgrade: plan.needUpgradeSubmit || plan.needUpgradeConfirm,
  };
};
