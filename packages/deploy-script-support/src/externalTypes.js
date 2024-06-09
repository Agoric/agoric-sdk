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
 * @typedef CoreEvalDescriptor
 * @property {string} sourceSpec import specifier for a module
 * @property {[manifestGetterName: string, ...manifestGetterArgs: any[]]} getManifestCall
 *   the name of a function exported by the module and arguments to invoke it
 *   with in order to get a manifest (a Record that associates functions to be
 *   invoked and permits defining bootstrap-space powers they will have access
 *   to, see {@link ../README.md} and {@link runModuleBehaviors})
 */

/**
 * @callback CoreEvalBuilder
 * @param {{
 *   publishRef: PublishBundleRef,
 *   install: InstallEntrypoint,
 *   wrapInstall?: <T extends InstallEntrypoint>(f: T) => T }
 * } powers
 * @param {...any} args
 * @returns {Promise<CoreEvalDescriptor>}
 */
