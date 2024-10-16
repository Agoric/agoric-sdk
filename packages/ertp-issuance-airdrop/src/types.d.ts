/**
 * Represents a natural number with semigroup concatenation capabilities.
 */
type NatInstance = {
    /**
     * - The integer value of the natural number.
     */
    value: import("@agoric/ertp/src/types.js").NatValue;
    /**
     * - A binary function
     * that takes another NatInstance and returns the sum NatInstance holding the
     */
    concat: (arg0: NatInstance) => NatInstance;
    /**
     * - A function that returns the integer
     * value contained in the NatInstance.
     */
    fold: () => import("@agoric/ertp/src/types.js").NatValue;
    /**
     * - A function that returns a string representation of the NatInstance.
     */
    inspect: () => string;
};
type EpochDetails = {
    /**
     * Length of epoch in seconds. This value is used by the contract's timerService to schedule a wake up that will fire once all of the seconds in an epoch have elapsed
     */
    windowLength: bigint;
    /**
     * The total number of tokens recieved by each user who claims during a particular epoch.
     */
    tokenQuantity: import("@agoric/ertp/src/types.js").NatValue;
    /**
     * The index of a particular epoch.
     */
    index: bigint;
    /**
     * Length of epoch formatted in total number of days
     */
    inDays: number;
};
/**
 * Represents cosmos account information.
 */
type cosmosAccountInformation = {
    /**
     * - The prefix.
     */
    prefix: string;
    /**
     * - The public key.
     */
    pubkey: {
        type: string;
        value: string;
    };
    /**
     * - The expected value.
     */
    expected: string;
};
/**
 * Object used for test purpoes only. The ExpectedValue
 */
type ExpectedValue = {
    expected: any;
};
/**
 * Represents a testable account with cosmos account information and expected value.
 */
type TestableAccount = cosmosAccountInformation & ExpectedValue;
/**
 * Represents a testable account with cosmos account information and expected value.
 */
type EligibleAccountObject = cosmosAccountInformation & {
    tier: string;
};
type CustomContractTerms = {
    /**
     * Values to be used when constructing each amount that will be paid to claimants according to their tier.
     */
    initialPayoutValues: bigint[];
    /**
     * The fee associated with exercising one's right to claim a token.
     */
    feePrice: import("@agoric/ertp/src/types.js").Amount;
    /**
     * Base supply of tokens to be distributed throughout an airdrop campaign.
     */
    targetTokenSupply: bigint;
    /**
     * Name of the token to be created and then airdropped to eligible claimaints.
     */
    tokenName: string;
    /**
     * Total number of epochs the airdrop campaign will last for.
     */
    targetNumberOfEpochs: number;
    /**
     * Length of time for each epoch, denominated in seconds.
     */
    targetEpochLength: bigint;
    /**
     * Length of time (denoted in seconds) between the time in which the contract is started and the time at which users can begin claiming tokens.
     */
    startTime: import("@agoric/time/src/types").RelativeTimeRecord;
    /**
     * Root hash of merkle tree containing all eligible claimans, represented as a hex string.
     */
    merkleRoot: string;
};
type DefaultZCFTerms = {
    brands: import("@agoric/ertp/src/types.js").Brand[];
    issuers: import("@agoric/ertp/src/types.js").Issuer[];
};
/**
 * Represents a testable account with cosmos account information and expected value.
 */
type ContractTerms = CustomContractTerms & DefaultZCFTerms;
//# sourceMappingURL=types.d.ts.map