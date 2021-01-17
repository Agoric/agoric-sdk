/**
 * @typedef {Object} CapData
 * @property {string} body
 * @property {Array<string>} slots
 */

/**
 * @typedef {{
 *   bundle: Bundle,
 *   enableSetup: false,
 * }} HasBundle
 * @typedef {{
 *   setup: unknown,
 *   enableSetup: true,
 * }} HasSetup
 *
 * TODO: metered...
 *
 * See validateManagerOptions() in factory.js
 * @typedef {{
 *   managerType: 'local' | 'nodeWorker' | 'node-subprocess' | 'xs-worker',
 *   metered?: boolean,
 *   enableInternalMetering?: boolean,
 *   vatParameters: Serializable,
 *   virtualObjectCacheSize: number,
 * } & (HasBundle | HasSetup)} ManagerOptions
 */
