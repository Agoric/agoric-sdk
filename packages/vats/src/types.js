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
 * @property {(...path: Array<string>) => Promise<any>} lookup Look up a
 * path of keys starting from the current NameHub.  Wait on any reserved
 * promises.
 * @property {() => Array<[string, unknown]>} entries get all the entries
 * available in the current NameHub
 * @property {() => Array<string>} keys get all names available in the current
 * NameHub
 * @property {() => Array<unknown>} values get all values available in the
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
 * @typedef {Object} BankDepositFacet
 *
 * @property {(brand: Brand, accounts: string[], payments: Payment[]) => Promise<PromiseSettledResult<Amount>[]>} depositMultiple
 * @property {() => Notifier<string[]>} getAccountsNotifier
 */

/**
 * @typedef {Object} DistributorParams
 *
 * @property {number} depositsPerUpdate - (number) how many payments should be
 *  sent to the Bank interface per updateInterval
 * @property {bigint} updateInterval - (bigint) parameter to the timer
 *  controlling the interval at which deposits are sent to the Bank API
 * @property {bigint} [epochInterval=1n] - parameter to the epochTimer
 *  controlling the interval at which rewards should be sent to the bank.
 * @property {Issuer} runIssuer
 * @property {Brand} runBrand
 */

/**
 * @callback BuildFeeDistributor
 *
 * @param {ERef<FeeCollector>} treasuryCollector - an object with a
 *  collectFees() method, which will return a payment. can be populated with
 *  makeTreasuryFeeCollector(zoe, treasuryCreatorFacet)
 * @param {ERef<BankDepositFacet>} bank - object with getAccountsNotifier() and
 *  depositMultiple() @param {ERef<TimerService>} epochTimer - timer that
 *  notifies at the end of each Epoch. The epochInterval parameter controls the
 *  interval.
 * @param {ERef<TimerService>} timer - timer controlling frequency at which
 *  batches of payments are sent to the bank for processing. The parameter
 *  updateInterval specifies the interval at which updates are sent.
 * @param {DistributorParams} params
 * @returns {Promise<void>}
 */
