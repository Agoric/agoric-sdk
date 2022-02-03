// @ts-check

/**
 * @template T
 * @typedef {import('@endo/far').EOnly<T>} EOnly
 */

/**
 * @typedef {Object} Board
 * @property {(id: string) => any} getValue
 * @property {(value: any) => string} getId
 * @property {(value: any) => boolean} has
 * @property {() => string[]} ids
 */

/**
 * @typedef {Object} NameHub
 *
 * NOTE: We need to return arrays, not iterables, because even if marshal could
 * allow passing a remote iterable, there would be an inordinate number of round
 * trips for the contents of even the simplest nameHub.
 *
 * @property {(...path: Array<string>) => Promise<any>} lookup Look up a
 * path of keys starting from the current NameHub.  Wait on any reserved
 * promises.
 * @property {() => [string, unknown][]} entries get all the entries
 * available in the current NameHub
 * @property {() => string[]} keys get all names available in the
 * current NameHub
 * @property {() => unknown[]} values get all values available in the
 * current NameHub
 */

/**
 * @typedef {Object} NameAdmin
 * @property {(key: string) => void} reserve Mark a key as reserved; will
 * return a promise that is fulfilled when the key is updated (or rejected when
 * deleted).
 * @property {(key: string, newValue: unknown) => void} update Fulfill an
 * outstanding reserved promise (if any) to the newValue and set the key to the
 * newValue.
 * @property {(key: string) => void} delete Delete a value and reject an
 * outstanding reserved promise (if any).
 */

/**
 * @typedef {NameAdmin & { getMyAddress(): string }} MyAddressNameAdmin
 */

/**
 * @typedef {Object} NameHubKit A kit of a NameHub and its corresponding
 * NameAdmin.
 * @property {NameHub} nameHub
 * @property {NameAdmin} nameAdmin
 */

/**
 * @typedef {Object} FeeCollector
 *
 * @property {() => ERef<Payment>} collectFees
 */

/**
 * @typedef {Object} DistributorParams
 *
 * @property {bigint} [epochInterval=1n] - parameter to the epochTimer
 *  controlling the interval at which rewards should be sent to the bank.
 */

/**
 * @callback BuildFeeDistributor
 *
 * @param {ERef<FeeCollector>[]} collectors - an array of objects with
 *   collectFees() methods, each of which will return a payment. Can
 *   be populated with the results of makeFeeCollector(zoe, creatorFacet)
 * @param {EOnly<DepositFacet>} feeDepositFacet - object with receive()
 * @param {ERef<TimerService>} epochTimer - timer that notifies at the end of
 *  each Epoch. The epochInterval parameter controls the interval.
 * @param {DistributorParams} params
 * @returns {Promise<void>}
 */
