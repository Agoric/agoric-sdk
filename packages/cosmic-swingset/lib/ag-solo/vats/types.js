// @ts-check

/**
 * @typedef {Object} Board
 * @property {(id: string) => any} getValue
 * @property {(value: any) => string} getId
 * @property {(value: any) => boolean} has
 * @property {() => string[]} ids
 */

/**
 * @typedef {Object} NameHub
 * @property {(...path: Array<unknown>) => Promise<unknown>} lookup Look up a
 * path of keys starting from the current NameHub.  Wait on any reserved
 * promises.
 */

/**
 * @typedef {Object} NameAdmin
 * @property {(key: unknown) => void} reserve Mark a key as reserved; will
 * return a promise that is fulfilled when the key is updated (or rejected when
 * deleted).
 * @property {(key: unknown, newValue: unknown) => void} update Fulfill an
 * outstanding reserved promise (if any) to the newValue and set the key to the
 * newValue.
 * @property {(key: unknown) => void} delete Delete a value and reject an
 * outstanding reserved promise (if any).
 */

/**
 * @typedef {Object} NameHubKit A kit of a NameHub and its corresponding
 * NameAdmin.
 * @property {NameHub} nameHub
 * @property {NameAdmin} nameAdmin
 */
