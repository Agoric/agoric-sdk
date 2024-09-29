/**
 * @file The purpose of this file is to bring together a set of tool that
 * developers can use to synchronize operations they carry out in their tests.
 * 
 * These operations include;
 * - Making sure a core-eval resulted succesfully deploying a contract
 * - Making sure a core-eval succesfully sent zoe invitations to committee members for governance
 * - Making sure an account is successfully funded with vbank assets like IST, BLD etc.
 *  - operation: query dest account's balance
 *  - condition: dest account has a balance >= sent token
 * - Making sure an offer is in a specific state, such as;
 *  - seated
 *  - successfuly resulted
 *  - error
 * 
 */

/**
 * @typedef {object} RetyrOptions
 * @property {number} maxRetries
 * @property {number} retryIntervalMs
 * @property {(...arg0: string[]) => void} log
 * @property {(object) => void} [setTimeout]
 * @property {string} [errorMessage=Error]
 * 
 * 
 * @typedef {object} CosmosBalanceThresold
 * @property {string} denom
 * @property {number} value
 */

const ambientSetTimeout = globalThis.setTimeout;

/**
 * 
 * @param {number} ms 
 * @param {*} sleepOptions 
 * @returns 
 */
export const sleep = (
    ms,
    { log = () => { }, setTimeout = ambientSetTimeout }
) =>
    new Promise(resolve => {
        // @ts-ignore
        log(`Sleeping for ${ms}ms...`);
        setTimeout(resolve, ms);
    });

/**
 * 
 * @param {() => Promise} operation 
 * @param {(result) => boolean} condition 
 * @param {string} message 
 * @param {RetyrOptions} options 
 * @returns 
 */
const retryUntilCondition = async (
    operation,
    condition,
    message,
    {
        maxRetries = 6,
        retryIntervalMs = 3500,
        log,
        setTimeout,
    }
) => {
    console.log({ maxRetries, retryIntervalMs, message });
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const result = await operation();
            console.log('RESULT', result)
            if (condition(result)) {
                return result;
            }
        } catch (error) {
            if (error instanceof Error) {
                log(`Error: ${error.message}`);
            } else {
                log(`Unknown error: ${String(error)}`);
            }
        }

        retries++;
        console.log(
            `Retry ${retries}/${maxRetries} - Waiting for ${retryIntervalMs}ms for ${message}...`,
        );
        await sleep(retryIntervalMs, { log, setTimeout });
    }

    throw Error(`${message} condition failed after ${maxRetries} retries.`);
};

export const makeRetryUntilCondition = (defaultOptions) => {
    /**
     * Retry an asynchronous operation until a condition is met.
     * Defaults to maxRetries = 6, retryIntervalMs = 3500
     */
    return (
        operation,
        condition,
        message,
        options,
    ) =>
        retryUntilCondition(operation, condition, message, {
            ...defaultOptions,
            ...options,
        });
};

/**
 * Making sure a core-eval resulted succesfully deploying a contract
 */
const makeGetInstances = follow => async () => {
    const instanceEntries = await follow(
        '-lF',
        `:published.agoricNames.instance`,
    );

    return Object.fromEntries(instanceEntries);
};

/**
 * 
 * @param {string} contractName 
 * @param {{follow: () => object, setTimeout: (object) => void}} ambientAuthroity 
 * @param {RetyrOptions} options 
 * @returns 
 */
export const waitUntilContractDeplyed = (contractName, ambientAuthroity, options) => {
    const { follow, setTimeout } = ambientAuthroity;
    const getInstances = makeGetInstances(follow);
    const { maxRetries = 6, retryIntervalMs = 3500, log = console.log, errorMessage = "Error" } = options;

    return retryUntilCondition(
        getInstances,
        instanceObject => Object.keys(instanceObject).includes(contractName),
        errorMessage,
        // @ts-ignore
        { maxRetries, retryIntervalMs, log, setTimeout }
    )
};

/**
 * Making sure an account is successfully funded with vbank assets like IST, BLD etc.
 * - operation: query dest account's balance
 * - condition: dest account has a balance >= sent token
 */

const makeQueryCosmosBalace = queryCb => async dest => {
    const conins = await queryCb('bank', 'balances', dest);
    return conins.balances;
};

/**
 * 
 * @param {Array} balances 
 * @param {CosmosBalanceThresold} thresold 
 * @returns {boolean}
 */
const checkCosmosBalance = (balances, thresold) => {
    const balance = [...balances].find(({ denom }) => denom === thresold.denom);
    return Number(balance.amount) >= thresold.value;
}

/**
 * @param {string} destAcct 
 * @param {{query: () => Promise<object>, setTimeout: (object) => void}} ambientAuthroity
 * @param {{denom: string, value: number}} threshold
 * @param {RetyrOptions} options 
 * @returns 
 */
export const waitUntilAccountFunded = (destAcct, ambientAuthroity, threshold, options) => {
    const { query, setTimeout } = ambientAuthroity;
    const queryCosmosBalance = makeQueryCosmosBalace(query);
    const { maxRetries = 6, retryIntervalMs = 3500, log = console.log, errorMessage = "Error" } = options;

    return retryUntilCondition(
        async () => queryCosmosBalance(destAcct),
        balances => checkCosmosBalance(balances, threshold),
        errorMessage,
        // @ts-ignore
        { maxRetries, retryIntervalMs, log, setTimeout }
    )
};

/**
 * - Making sure an offer is resulted;
 */

const makeQueryWallet = follow => async (/** @type {String} */ addr) => {
    const update = await follow(
        '-lF',
        `:published.wallet.${addr}`,
    );

    return update;
};

/**
 * 
 * @param {object} offerStatus 
 * @param {boolean} waitForPayouts 
 * @param {string} offerId 
 * @returns 
 */
const checkOfferState = (offerStatus, waitForPayouts, offerId) => {
    const { updated, status } = offerStatus;

    if (updated !== "offerStatus") return false;
    if (!status) return false;
    if (status.id !== offerId) return false;
    if (!status.numWantsSatisfied || status.numWantsSatisfied !== 1) return false;
    if (waitForPayouts && status.result && status.payouts) return true;
    if (!waitForPayouts && status.result) return true;

    return false;
};

/**
 * 
 * @param {string} addr 
 * @param {string} offerId 
 * @param {boolean} waitForPayouts 
 * @param {{follow: () => object, setTimeout: (object) => void}} ambientAuthroity 
 * @param {RetyrOptions} options 
 * @returns 
 */
export const waitUntilOfferResult = (addr, offerId, waitForPayouts, ambientAuthroity, options) => {
    const { follow, setTimeout } = ambientAuthroity;
    const queryWallet = makeQueryWallet(follow);
    const { maxRetries = 6, retryIntervalMs = 3500, log = console.log, errorMessage = "Error" } = options;

    return retryUntilCondition(
        async () => queryWallet(addr),
        status => checkOfferState(status, waitForPayouts, offerId),
        errorMessage,
        // @ts-ignore
        { maxRetries, retryIntervalMs, log, setTimeout }
    )
};

/**
 * Making sure a core-eval succesfully sent zoe invitations to committee members for governance
 */

/**
 * 
 * @param {{ updated: string, currentAmount: any }} update 
 * @returns {boolean}
 */
const checkForInvitation = update => {
    const { updated, currentAmount } = update;

    if (updated !== 'balance') return false;
    if (!currentAmount || !currentAmount.brand) return false;
    
    return currentAmount.brand.includes('Invitation');
};

/**
 * 
 * @param {string} addr 
 * @param {{follow: () => object, setTimeout: (object) => void}} ambientAuthroity 
 * @param {RetyrOptions} options 
 * @returns 
 */
export const waitUntilInvitationReceived = (addr, ambientAuthroity, options) => {
    const { follow, setTimeout } = ambientAuthroity;
    const queryWallet = makeQueryWallet(follow);
    const { maxRetries = 6, retryIntervalMs = 3500, log = console.log, errorMessage = "Error" } = options;

    return retryUntilCondition(
        async () => queryWallet(addr),
        checkForInvitation,
        errorMessage,
        // @ts-ignore
        { maxRetries, retryIntervalMs, log, setTimeout }
    )
};