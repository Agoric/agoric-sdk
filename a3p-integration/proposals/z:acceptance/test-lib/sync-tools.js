/* eslint-env node */

/**
 * @file The purpose of this file is to bring together a set of tools that
 * developers can use to synchronize operations they carry out in their tests.
 *
 * These operations include;
 * - Making sure a core-eval resulted in successfully deploying a contract
 * - Making sure a core-eval successfully sent zoe invitations to committee members for governance
 * - Making sure an account is successfully funded with vbank assets like IST, BLD etc.
 *  - operation: query dest account's balance
 *  - condition: dest account has a balance >= sent token
 * - Making sure an offer resulted successfully
 *
 */

/**
 * @typedef {object} RetryOptions
 * @property {number} maxRetries
 * @property {number} retryIntervalMs
 * @property {(...arg0: string[]) => void} log
 * @property {(object) => void} [setTimeout]
 * @property {string} [errorMessage=Error]
 *
 *
 * @typedef {object} CosmosBalanceThreshold
 * @property {string} denom
 * @property {number} value
 */

const ambientSetTimeout = global.setTimeout;

/**
 * From https://github.com/Agoric/agoric-sdk/blob/442f07c8f0af03281b52b90e90c27131eef6f331/multichain-testing/tools/sleep.ts#L10
 *
 * @param {number} ms
 * @param {*} sleepOptions
 */
const sleep = (ms, { log = () => {}, setTimeout = ambientSetTimeout }) =>
  new Promise(resolve => {
    log(`Sleeping for ${ms}ms...`);
    setTimeout(resolve, ms);
  });

/**
 * From https://github.com/Agoric/agoric-sdk/blob/442f07c8f0af03281b52b90e90c27131eef6f331/multichain-testing/tools/sleep.ts#L24
 *
 * @param {() => Promise} operation
 * @param {(result: any) => boolean} condition
 * @param {string} message
 * @param {RetryOptions} options
 */
export const retryUntilCondition = async (
  operation,
  condition,
  message,
  { maxRetries = 6, retryIntervalMs = 3500, log, setTimeout },
) => {
  console.log({ maxRetries, retryIntervalMs, message });
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const result = await operation();
      log('RESULT', result);
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

    retries += 1;
    console.log(
      `Retry ${retries}/${maxRetries} - Waiting for ${retryIntervalMs}ms for ${message}...`,
    );
    await sleep(retryIntervalMs, { log, setTimeout });
  }

  throw Error(`${message} condition failed after ${maxRetries} retries.`);
};

/**
 * @param {RetryOptions} options
 */
const overrideDefaultOptions = options => {
  const defaultValues = {
    maxRetries: 6,
    retryIntervalMs: 3500,
    log: console.log,
    errorMessage: 'Error',
  };

  return { ...defaultValues, ...options };
};

/// ////////// Making sure a core-eval resulted successfully deploying a contract /////////////

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
 * @param {{follow: () => object, setTimeout: (object) => void}} ambientAuthority
 * @param {RetryOptions} options
 */
export const waitUntilContractDeployed = (
  contractName,
  ambientAuthority,
  options,
) => {
  const { follow, setTimeout } = ambientAuthority;
  const getInstances = makeGetInstances(follow);
  const { maxRetries, retryIntervalMs, errorMessage, log } =
    overrideDefaultOptions(options);

  return retryUntilCondition(
    getInstances,
    instanceObject => Object.keys(instanceObject).includes(contractName),
    errorMessage,
    { maxRetries, retryIntervalMs, log, setTimeout },
  );
};

/// ////////// Making sure an account is successfully funded with vbank assets like IST, BLD etc. ///////////////

const makeQueryCosmosBalance = queryCb => async dest => {
  const coins = await queryCb('bank', 'balances', dest);
  return coins.balances;
};

/**
 *
 * @param {Array} balances
 * @param {CosmosBalanceThreshold} threshold
 * @returns {boolean}
 */
const checkCosmosBalance = (balances, threshold) => {
  const balance = [...balances].find(({ denom }) => denom === threshold.denom);
  return Number(balance.amount) >= threshold.value;
};

/**
 * @param {string} destAcct
 * @param {{query: () => Promise<object>, setTimeout: (object) => void}} ambientAuthority
 * @param {{denom: string, value: number}} threshold
 * @param {RetryOptions} options
 */
export const waitUntilAccountFunded = (
  destAcct,
  ambientAuthority,
  threshold,
  options,
) => {
  const { query, setTimeout } = ambientAuthority;
  const queryCosmosBalance = makeQueryCosmosBalance(query);
  const { maxRetries, retryIntervalMs, errorMessage, log } =
    overrideDefaultOptions(options);

  return retryUntilCondition(
    async () => queryCosmosBalance(destAcct),
    balances => checkCosmosBalance(balances, threshold),
    errorMessage,
    { maxRetries, retryIntervalMs, log, setTimeout },
  );
};

/// ////////// Making sure an offers get results  /////////////

const makeQueryWallet = follow => async (/** @type {string} */ addr) => {
  const update = await follow('-lF', `:published.wallet.${addr}`);

  return update;
};

/**
 *
 * @param {object} offerStatus
 * @param {boolean} waitForPayouts
 * @param {string} offerId
 */
const checkOfferState = (offerStatus, waitForPayouts, offerId) => {
  const { updated, status } = offerStatus;

  if (updated !== 'offerStatus') return false;
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
 * @param {{follow: () => object, setTimeout: (object) => void}} ambientAuthority
 * @param {RetryOptions} options
 */
export const waitUntilOfferResult = (
  addr,
  offerId,
  waitForPayouts,
  ambientAuthority,
  options,
) => {
  const { follow, setTimeout } = ambientAuthority;
  const queryWallet = makeQueryWallet(follow);
  const { maxRetries, retryIntervalMs, errorMessage, log } =
    overrideDefaultOptions(options);

  return retryUntilCondition(
    async () => queryWallet(addr),
    status => checkOfferState(status, waitForPayouts, offerId),
    errorMessage,
    { maxRetries, retryIntervalMs, log, setTimeout },
  );
};

/// ////////// Making sure a core-eval successfully sent zoe invitations to committee members for governance /////////////

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
 * @param {{follow: () => object, setTimeout: (object) => void}} ambientAuthority
 * @param {RetryOptions} options
 */
export const waitUntilInvitationReceived = (
  addr,
  ambientAuthority,
  options,
) => {
  const { follow, setTimeout } = ambientAuthority;
  const queryWallet = makeQueryWallet(follow);
  const { maxRetries, retryIntervalMs, errorMessage, log } =
    overrideDefaultOptions(options);

  return retryUntilCondition(
    async () => queryWallet(addr),
    checkForInvitation,
    errorMessage,
    { maxRetries, retryIntervalMs, log, setTimeout },
  );
};
