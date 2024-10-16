export namespace messagesObject {
    function makeClaimInvitationDescription(): string;
    function makeIllegalActionString(status: any): string;
}
export const OPEN: string;
export const EXPIRED: string;
export const PREPARED: string;
export const INITIALIZED: string;
export const RESTARTING: string;
export namespace privateArgsShape {
    export let marshaller: import("@endo/patterns").Matcher;
    export let storageNode: import("@endo/patterns").Matcher;
    export { TimerShape as timer };
}
export namespace customTermsShape {
    export let targetEpochLength: import("@endo/patterns").Matcher;
    export let initialPayoutValues: import("@endo/patterns").Matcher;
    export let tokenName: import("@endo/patterns").Matcher;
    export let targetTokenSupply: import("@endo/patterns").Matcher;
    export let targetNumberOfEpochs: import("@endo/patterns").Matcher;
    export let startTime: import("@endo/patterns").Matcher;
    export { AmountShape as feeAmount };
    export let merkleRoot: import("@endo/patterns").Matcher;
}
export function divideAmountByTwo(brand: any): (amount: any) => import("@agoric/ertp/src/types.js").NatAmount;
export function start(zcf: ZCF<ContractTerms>, privateArgs: {
    marshaller: typeof Remotable;
    timer: TimerService;
}, baggage: Baggage): Promise<{
    creatorFacet: import("@endo/exo").Guarded<{
        getBankAssetMint(): ZCFMint<globalThis.AssetKind>;
        pauseContract(): void;
    }>;
    publicFacet: import("@endo/exo").Guarded<{
        makeClaimTokensInvitation(): Promise<Invitation<string, {
            proof: any[];
            address: string;
            key: string;
            tier: number;
        }>>;
        getStatus(): any;
        getEpoch(): null;
        getPayoutValues(): any;
    }>;
}>;
import { TimerShape } from '@agoric/zoe/src/typeGuards.js';
import { AmountShape } from '@agoric/ertp';
import type { Remotable } from '@endo/marshal';
import type { TimerService } from '@agoric/time/src/types.js';
import type { Baggage } from '@agoric/vat-data';
//# sourceMappingURL=airdrop.contract.d.ts.map