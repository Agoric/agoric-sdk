import type { Amount, Brand, Payment, Purse } from '@agoric/ertp';
import { deeplyFulfilledObject, NonNullish, objectMap } from '@agoric/internal';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { VowTools } from '@agoric/vow';
import type {
  AmountKeywordRecord,
  Instance,
  Invitation,
  PaymentKeywordRecord,
  ZoeService,
} from '@agoric/zoe';
import type { ContractStartFunction } from '@agoric/zoe/src/zoeService/utils.js';
import type { StartedInstanceKit } from '@agoric/zoe/src/zoeService/utils.js';
import type { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import type { CopyRecord } from '@endo/pass-style';

const { keys } = Object;

const collectPayments = async (
  give: AmountKeywordRecord | undefined,
  providePurse: (b: Brand) => Purse,
) =>
  (give
    ? deeplyFulfilledObject(
        objectMap(give, amt =>
          NonNullish(providePurse, 'providePurse')(amt.brand).withdraw(amt),
        ),
      )
    : {}) as unknown as PaymentKeywordRecord;

/**
 * Approximate smart wallet API
 *
 * @param zoe from startContract
 * @param when from vowTools
 * @param spec supports both 'contract' and 'continuing' sources
 * @param providePurse where to get payments?
 * @param invitationStore a map to store/retrieve invitationMakers by offerId
 */
export const executeOffer = async <R = any>(
  zoe: ZoeService,
  when: VowTools['when'],
  spec: OfferSpec & {
    invitationSpec: {
      source: 'contract' | 'continuing';
      instance?: any;
      publicInvitationMaker?: string;
      previousOffer?: string;
      invitationMakerName?: string;
      invitationArgs?: any[];
    };
  },
  providePurse?: (b: Brand) => Purse,
  invitationStore?: Map<string, any>,
) => {
  const { invitationSpec, proposal, offerArgs } = spec;
  let invitation: Invitation<R>;

  if (invitationSpec.source === 'contract') {
    // Original contract source case
    const { instance, publicInvitationMaker, invitationArgs } = invitationSpec;

    if (!instance || !publicInvitationMaker) {
      throw new Error(
        'Contract invitation requires instance and publicInvitationMaker',
      );
    }

    invitation = await E(E(zoe).getPublicFacet(instance))[
      publicInvitationMaker
    ](...(invitationArgs || []));
  } else if (invitationSpec.source === 'continuing') {
    // New continuing source case
    const { previousOffer, invitationMakerName } = invitationSpec;

    if (!previousOffer || !invitationMakerName) {
      throw new Error(
        'Continuing invitation requires previousOffer and invitationMakerName',
      );
    }

    if (!invitationStore) {
      throw new Error('Continuing offers require an invitationStore');
    }

    const invitationMakers = invitationStore.get(previousOffer);
    if (!invitationMakers) {
      throw new Error(
        `No invitation makers found for offer ID: ${previousOffer}`,
      );
    }

    invitation = await E(invitationMakers)[invitationMakerName]();
  } else {
    // This case should never happen due to type restrictions
    throw new Error(
      `Unsupported invitation source: ${(invitationSpec as any).source}`,
    );
  }

  const payments = await collectPayments(
    proposal.give,
    NonNullish(providePurse, 'providePurse'),
  );
  const seat = await E(zoe).offer(invitation, proposal, payments, offerArgs);
  const result = await when(E(seat).getOfferResult());
  const payouts = await E(seat).getPayouts();
  return harden({ result, payouts });
};

// Define separate types for contract and continuing invitation specs
export type ContractInvitationSpec<
  SF extends ContractStartFunction,
  M extends keyof StartedInstanceKit<SF>['publicFacet'],
> = {
  source: 'contract';
  instance: Instance<SF>;
  publicInvitationMaker: M;
  invitationArgs?: any[];
};

export type ContinuingInvitationSpec = {
  source: 'continuing';
  previousOffer: string;
  invitationMakerName: string;
};

export type InvitationMakerSpec<
  SF extends ContractStartFunction,
  M extends keyof StartedInstanceKit<SF>['publicFacet'],
> = OfferSpec & {
  invitationSpec: ContractInvitationSpec<SF, M> | ContinuingInvitationSpec;
  id?: string; // Optional ID for storing the result for future continuing offers
};

export interface WalletTool {
  getAssets: () => Record<
    string,
    Omit<ReturnType<typeof withAmountUtils>, 'mint'>
  >;
  /**
   * Execute an offer with either a 'contract' or 'continuing' invitation source
   */
  executePublicOffer<
    SF extends ContractStartFunction,
    M extends keyof StartedInstanceKit<SF>['publicFacet'],
  >(
    spec: InvitationMakerSpec<SF, M>,
  ): Promise<{ result: any; payouts: AmountKeywordRecord }>;
  executeContinuingOffer(
    spec: OfferSpec & { invitationSpec: { source: 'continuing' } },
    offerArgs?: CopyRecord,
  ): Promise<{ result: any; payouts: AmountKeywordRecord }>;
  deposit(p: Payment<'nat'>): Promise<Amount<'nat'>>;
}

export const makeWallet = (
  assets: Record<
    'USDC' | 'Access',
    Omit<ReturnType<typeof withAmountUtils>, 'mint'>
  >,
  zoe: ZoeService,
  when,
): WalletTool => {
  const purses = {
    USDC: assets.USDC.issuer.makeEmptyPurse(),
    Access: assets.Access.issuer.makeEmptyPurse(),
  };

  // Store invitation makers by offer id
  const invitationStore = new Map();

  const providePurse = (b: Brand) =>
    purses[
      keys(assets).find(k => assets[k].brand === b) || Fail`no purse for ${b}`
    ];

  const offerToInvitationMakers = new Map();

  const wallet: WalletTool = harden({
    getAssets: () => assets,
    async executePublicOffer(spec) {
      const { result, payouts } = await executeOffer(
        zoe,
        when,
        spec,
        providePurse,
        invitationStore,
      );

      // Store invitation makers if present in the result for continuing offers
      if (result && result.invitationMakers && spec.id) {
        invitationStore.set(spec.id, result.invitationMakers);
      }

      const refund: AmountKeywordRecord = await deeplyFulfilledObject(
        objectMap(payouts, async pmt => wallet.deposit(await pmt)),
      );

      if (typeof result === 'object' && 'invitationMakers' in result) {
        offerToInvitationMakers.set(spec.id, result.invitationMakers);
      }

      return { result, payouts: refund };
    },
    async executeContinuingOffer(spec, offerArgs = harden({})) {
      const {
        previousOffer,
        invitationMakerName,
        invitationArgs = [],
      } = spec.invitationSpec;
      const makers =
        offerToInvitationMakers.get(previousOffer) ||
        Fail`${previousOffer} not found`;
      const invitation = E(makers)[invitationMakerName](...invitationArgs);

      const { proposal } = spec;
      const payments = await collectPayments(
        proposal.give,
        NonNullish(providePurse, 'providePurse'),
      );
      const seat = await E(zoe).offer(
        invitation,
        proposal,
        payments,
        offerArgs,
      );
      const result = await when(E(seat).getOfferResult());
      const payouts = await E(seat).getPayouts();
      const refund: AmountKeywordRecord = await deeplyFulfilledObject(
        objectMap(payouts, async pmt => wallet.deposit(await pmt)),
      );
      return harden({ result, payouts: refund });
    },

    async deposit(pmt) {
      const brand = await E(pmt).getAllegedBrand();
      const purse = providePurse(brand);
      return purse.deposit(pmt);
    },
  });
  return wallet;
};
