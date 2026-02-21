export function sleep(ms: number, { log, setTimeout }: RetryPowers): Promise<any>;
export function retryUntilCondition<T = unknown>(operation: () => Promise<T>, condition: (result: T) => boolean, message: string, { maxRetries, retryIntervalMs, reusePromise, renderResult, log, setTimeout, }: RetryOptionsAndPowers): Promise<T>;
export function waitUntilContractDeployed(contractName: string, ambientAuthority: {
    log: (message: string) => void;
    follow: () => object;
    setTimeout: typeof globalThis.setTimeout;
}, options: WaitUntilOptions): Promise<{
    [k: string]: any;
}>;
export function waitUntilAccountFunded(destAcct: string, io: {
    log?: (message: string) => void;
    query: () => Promise<object>;
    setTimeout: typeof globalThis.setTimeout;
}, threshold: {
    denom: string;
    value: number;
}, options: WaitUntilOptions): Promise<any>;
export function waitUntilOfferResult(addr: string, offerId: string, waitForPayouts: boolean, io: {
    log?: typeof console.log;
    follow: () => object;
    setTimeout: typeof globalThis.setTimeout;
}, options: WaitUntilOptions): Promise<any>;
export function waitUntilInvitationReceived(addr: string, io: {
    follow: () => object;
    log: typeof console.log;
    setTimeout: typeof globalThis.setTimeout;
}, options: WaitUntilOptions): Promise<any>;
export function waitUntilOfferExited(addr: string, offerId: string, io: {
    follow: () => object;
    log: typeof console.log;
    setTimeout: typeof globalThis.setTimeout;
}, options: WaitUntilOptions): Promise<any>;
export function waitUntilElectionResult(committeePathBase: string, expectedResult: {
    outcome: string;
    deadline: bigint;
}, io: {
    vstorage: VstorageKit;
    log: typeof console.log;
    setTimeout: typeof globalThis.setTimeout;
}, options: WaitUntilOptions): Promise<ElectionResult>;
export type RetryOptions = {
    maxRetries?: number | undefined;
    retryIntervalMs?: number | undefined;
    reusePromise?: boolean | undefined;
    renderResult?: ((value: unknown) => unknown) | undefined;
};
export type RetryPowers = {
    setTimeout: typeof globalThis.setTimeout;
    log?: ((...args: unknown[]) => void) | undefined;
};
/**
 * mixes ocaps with configuration
 */
export type RetryOptionsAndPowers = RetryOptions & RetryPowers;
export type WaitUntilOptions = RetryOptions & {
    errorMessage: string;
};
export type CosmosBalanceThreshold = {
    denom: string;
    value: number;
};
export type ElectionResult = {
    latestOutcome: {
        outcome: string;
        question: RemotableObject;
    };
    latestQuestion: {
        closingRule: {
            deadline: bigint;
        };
        questionHandle: RemotableObject;
    };
};
import type { VstorageKit } from './vstorage-kit.js';
import type { RemotableObject } from '@endo/marshal';
//# sourceMappingURL=sync-tools.d.ts.map