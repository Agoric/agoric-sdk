// @ts-check
export {};

// TODO move this type somewhere better
/**
 * @typedef {string | string[]} Petname A petname can either be a plain string
 * or a path for which the first element is a petname for the origin, and the
 * rest of the elements are a snapshot of the names that were first given by that
 * origin.  We are migrating away from using plain strings, for consistency.
 */

/**
 * @typedef {{fileName?: string} & ({ bundleName: string } | { bundleID: string}) } ManifestBundleRef
 */

/**
 * @callback PublishBundleRef
 * @param {ERef<ManifestBundleRef>} bundle
 * @returns {Promise<ManifestBundleRef>}
 */

/**
 * @callback InstallEntrypoint
 * @param {string} srcSpec
 * @param {string} [bundlePath]
 * @param {unknown} [opts]
 * @returns {Promise<ManifestBundleRef>}
 */

/**
 * @callback CoreEvalBuilder
 * @param {{
 *   publishRef: PublishBundleRef,
 *   install: InstallEntrypoint,
 *   wrapInstall?: <T extends InstallEntrypoint>(f: T) => T }
 * } powers
 * @param {...any} args
 * @returns {Promise<{sourceSpec: string, getManifestCall: [exportedGetManifest: string, ...manifestArgs: any[]]}>}
 */
