export function makeWalletStateCoalescer(invitationBrand?: Brand<"set">): {
    state: {
        invitationsReceived: Map<string, {
            acceptedIn?: OfferId;
            description: string;
            instance: Instance;
        }>;
        offerStatuses: Map<OfferId, OfferStatus>;
        balances: Map<Brand, Amount>;
    };
    update: (updateRecord: UpdateRecord | {}) => void;
};
export function getInvocationUpdate(id: string | number, getLastUpdate: () => Promise<UpdateRecord>, retryOpts: RetryOptionsAndPowers): Promise<(UpdateRecord & {
    updated: "invocation";
})["result"]>;
export function getOfferResult(id: string | number, getLastUpdate: () => Promise<UpdateRecord>, retryOpts: RetryOptionsAndPowers): Promise<OfferStatus>;
export function getOfferWantsSatisfied(id: string | number, getLastUpdate: () => Promise<UpdateRecord>, retryOpts: RetryOptionsAndPowers): Promise<OfferStatus>;
export type CoalescedWalletState = ReturnType<typeof makeWalletStateCoalescer>["state"];
import type { Brand } from '@agoric/ertp/src/types.js';
import type { OfferId } from '@agoric/smart-wallet/src/offers.js';
import type { Instance } from '@agoric/zoe';
import type { OfferStatus } from '@agoric/smart-wallet/src/offers.js';
import type { Amount } from '@agoric/ertp/src/types.js';
import type { UpdateRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import type { RetryOptionsAndPowers } from './sync-tools.js';
//# sourceMappingURL=smart-wallet-utils.d.ts.map