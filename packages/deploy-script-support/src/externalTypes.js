// @ts-check
export {};

/**
 * @import {NameHub} from '@agoric/vats';
 */

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

/**
 * @typedef {{
 *  bundleSource: typeof import('@endo/bundle-source').default,
 *  cacheDir: string,
 *  lookup: (...path: string[]) => unknown,
 *  now: () => number,
 *  pathResolve: (...path: string[]) => string,
 *  publishBundle: PublishBundleRef,
 *  scriptArgs?: string[],
 * }} DeployScriptEndownments
 */

/**
 * @typedef {{
 *   scratch: ERef<import('@agoric/internal/src/scratch.js').ScratchPad>,
 * }} CommonHome
 */

// TODO wallet as import('@agoric/wallet-backend/src/types').WalletAdmin once it's a module
/**
 * @typedef {CommonHome & {
 * agoricNames: ERef<NameHub>,
 * bank: ERef<import("@agoric/vats/src/vat-bank.js").Bank>,
 * board: ERef<import("@agoric/vats").Board>,
 * faucet: unknown,
 * myAddressNameAdmin: ERef<import("@agoric/vats").NameAdmin>,
 * namesByAddress: ERef<NameHub>,
 * wallet: any,
 * zoe: ERef<ZoeService>,
 * }} AgSoloHome
 */

/**
 * @callback DeployScriptFunction
 * @param {Promise<CommonHome>} homeP
 * @param {DeployScriptEndownments} endowments
 * @returns {Promise<void>}
 */
