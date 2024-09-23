/**
 * @typedef {object} NatInstance
 * Represents a natural number with semigroup concatenation capabilities.
 *
 * @property {import('@agoric/ertp/src/types.js').NatValue} value - The integer value of the natural number.
 * @property {function(NatInstance): NatInstance} concat - A binary function
 *           that takes another NatInstance and returns the sum NatInstance holding the
 * @property {function(): import('@agoric/ertp/src/types.js').NatValue} fold - A function that returns the integer
 *           value contained in the NatInstance.
 * @property {function(): string} inspect - A function that returns a string representation of the NatInstance.
 */

/**
 * @typedef {object} EpochDetails
 * @property {bigint} windowLength Length of epoch in seconds. This value is used by the contract's timerService to schedule a wake up that will fire once all of the seconds in an epoch have elapsed
 * @property {import('@agoric/ertp/src/types.js').NatValue} tokenQuantity The total number of tokens recieved by each user who claims during a particular epoch.
 * @property {bigint} index The index of a particular epoch.
 * @property {number} inDays Length of epoch formatted in total number of days
 */

/**
 * Represents cosmos account information.
 * @typedef {object} cosmosAccountInformation
 * @property {string} prefix - The prefix.
 * @property {object} pubkey - The public key.
 * @property {string} pubkey.type - The type of the public key.
 * @property {string} pubkey.value - The value of the public key.
 * @property {string} expected - The expected value.
 */

/**
 * Object used for test purpoes only. The ExpectedValue
 * @typedef {object} ExpectedValue
 * @property {any} expected
 */

/**
 * Represents a testable account with cosmos account information and expected value.
 * @typedef {cosmosAccountInformation & ExpectedValue} TestableAccount
 */

/**
 * Represents a testable account with cosmos account information and expected value.
 * @typedef {cosmosAccountInformation & {tier: string}} EligibleAccountObject
 */

/**
 * @typedef {object} CustomContractTerms
 * @property {bigint[]} initialPayoutValues Values to be used when constructing each amount that will be paid to claimants according to their tier.
 * @property {import('@agoric/ertp/src/types.js').Amount} feePrice The fee associated with exercising one's right to claim a token.
 * @property {bigint} targetTokenSupply Base supply of tokens to be distributed throughout an airdrop campaign.
 * @property {string} tokenName Name of the token to be created and then airdropped to eligible claimaints.
 * @property {number} targetNumberOfEpochs Total number of epochs the airdrop campaign will last for.
 * @property {bigint} targetEpochLength Length of time for each epoch, denominated in seconds.
 * @property {import('@agoric/time/src/types').RelativeTimeRecord} startTime Length of time (denoted in seconds) between the time in which the contract is started and the time at which users can begin claiming tokens.
 * @property {string} merkleRoot Root hash of merkle tree containing all eligible claimans, represented as a hex string.
 */

/**
 * @typedef {object} DefaultZCFTerms
 * @property {import('@agoric/ertp/src/types.js').Brand[]} brands
 * @property {import('@agoric/ertp/src/types.js').Issuer[]} issuers
 */

/**
 * Represents a testable account with cosmos account information and expected value.
 * @typedef {CustomContractTerms & DefaultZCFTerms} ContractTerms
 */
