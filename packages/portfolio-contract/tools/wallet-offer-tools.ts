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
import type {
  ContractStartFunction,
  StartedInstanceKit,
} from '@agoric/zoe/src/zoeService/utils.js';
import type { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { Fail } from '@endo/errors';
import { E } from '@endo/far';

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
 * @param spec note: only source: 'contract' is supported
 * @param providePurse where to get payments?
 */
export const executeOffer = async <R = any>(
  zoe: ZoeService,
  when: VowTools['when'],
  spec: OfferSpec & { invitationSpec: { source: 'contract' } },
  providePurse?: (b: Brand) => Purse,
  /** called with the offer result, before waiting for payouts */
  onResult?: (result: unknown) => void,
) => {
  const { invitationSpec, proposal, offerArgs } = spec;
  assert.equal(invitationSpec.source, 'contract', 'not supported');
  const { instance, publicInvitationMaker, invitationArgs } = invitationSpec;
  const invitation: Invitation<R> = await E(E(zoe).getPublicFacet(instance))[
    publicInvitationMaker
  ](...(invitationArgs || []));

  const payments = await collectPayments(
    proposal.give,
    NonNullish(providePurse, 'providePurse'),
  );
  const seat = await E(zoe).offer(invitation, proposal, payments, offerArgs);
  const result = await when(E(seat).getOfferResult());
  onResult?.(result);
  const payouts = await E(seat).getPayouts();
  return harden({ result, payouts });
};

export type InvitationMakerSpec<
  SF extends ContractStartFunction,
  M extends keyof StartedInstanceKit<SF>['publicFacet'],
> = OfferSpec & {
  invitationSpec: {
    source: 'contract';
    instance: Instance<SF>;
    publicInvitationMaker: M;
  };
};

export interface WalletTool {
  getAssets: () => Record<
    string,
    Omit<ReturnType<typeof withAmountUtils>, 'mint'>
  >;
  /**
   * @param spec limited to source contract
   */
  executePublicOffer<
    SF extends ContractStartFunction,
    M extends keyof StartedInstanceKit<SF>['publicFacet'],
  >(
    spec: InvitationMakerSpec<SF, M>,
    opts?: {
      /**
       * Called with the offer result as soon as it is available, which can be
       * well before the payouts (e.g. while a flow the offer started runs).
       */
      onResult?: (result: any) => void;
    },
  ): Promise<{ result: any; payouts: AmountKeywordRecord }>;
  executeContinuingOffer(
    spec: OfferSpec & { invitationSpec: { source: 'continuing' } },
  ): Promise<{ result: any; payouts: AmountKeywordRecord }>;
  deposit(p: Payment<'nat'>): Promise<Amount<'nat'>>;
}

export const makeWallet = (
  assets: Record<
    'USDC' | 'BLD' | 'Access',
    Omit<ReturnType<typeof withAmountUtils>, 'mint'>
  >,
  zoe: ZoeService,
  when,
): WalletTool => {
  const purses = objectMap(assets, a => a.issuer.makeEmptyPurse());

  const providePurse = (b: Brand) =>
    purses[
      keys(assets).find(k => assets[k].brand === b) || Fail`no purse for ${b}`
    ];

  const offerToInvitationMakers = new Map();

  const wallet: WalletTool = harden({
    getAssets: () => assets,
    async executePublicOffer(spec, { onResult } = {}) {
      const { result, payouts } = await executeOffer(
        zoe,
        when,
        spec,
        providePurse,
        r => {
          // Allow continuing offers before the payouts arrive.
          if (r && typeof r === 'object' && 'invitationMakers' in r) {
            offerToInvitationMakers.set(spec.id, r.invitationMakers);
          }
          onResult?.(r);
        },
      );
      const refund: AmountKeywordRecord = await deeplyFulfilledObject(
        objectMap(payouts, async pmt => E.when(pmt, wallet.deposit)),
      );

      if (typeof result === 'object' && 'invitationMakers' in result) {
        offerToInvitationMakers.set(spec.id, result.invitationMakers);
      }

      return { result, payouts: refund };
    },
    async executeContinuingOffer(spec) {
      const {
        previousOffer,
        invitationMakerName,
        invitationArgs = [],
      } = spec.invitationSpec;
      const makers =
        offerToInvitationMakers.get(previousOffer) ||
        Fail`${previousOffer} not found`;
      const invitation = E(makers)[invitationMakerName](...invitationArgs);

      const { proposal, offerArgs = harden({}) } = spec;
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
        objectMap(payouts, async pmt => E.when(pmt, wallet.deposit)),
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
