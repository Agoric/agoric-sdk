import { deeplyFulfilledObject, NonNullish, objectMap } from '@agoric/internal';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { VowTools } from '@agoric/vow';
import type { AmountKeywordRecord, PaymentKeywordRecord } from '@agoric/zoe';
import type { ContractStartFunction } from '@agoric/zoe/src/zoeService/utils';
import type { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { Fail } from '@endo/errors';
import { E } from '@endo/far';

const { keys } = Object;

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
) => {
  const { invitationSpec, proposal, offerArgs } = spec;
  assert.equal(invitationSpec.source, 'contract', 'not supported');
  const { instance, publicInvitationMaker, invitationArgs } = invitationSpec;
  const invitation: Invitation<R> = await E(E(zoe).getPublicFacet(instance))[
    publicInvitationMaker
  ](...(invitationArgs || []));

  const payments = (proposal.give
    ? await deeplyFulfilledObject(
        objectMap(proposal.give, amt =>
          NonNullish(providePurse, 'providePurse')(amt.brand).withdraw(amt),
        ),
      )
    : {}) as unknown as PaymentKeywordRecord;
  const seat = await E(zoe).offer(invitation, proposal, payments, offerArgs);
  const result = await when(E(seat).getOfferResult());
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
  /**
   * @param spec limited to source contract
   */
  executeOffer<
    SF extends ContractStartFunction,
    M extends keyof StartedInstanceKit<SF>['publicFacet'],
  >(
    spec: InvitationMakerSpec<SF, M>,
  ): Promise<{ result: any; payouts: AmountKeywordRecord }>;
  deposit(p: Payment<'nat'>): Promise<Amount<'nat'>>;
}

export const makeWallet = (
  assets: Record<'USDC', Omit<ReturnType<typeof withAmountUtils>, 'mint'>>,
  zoe: ZoeService,
  when,
): WalletTool => {
  const purses = {
    USDC: assets.USDC.issuer.makeEmptyPurse(),
  };

  /** @param {Brand} b */
  const providePurse = b =>
    purses[
      keys(assets).find(k => assets[k].brand === b) || Fail`no purse for ${b}`
    ];
  const wallet: WalletTool = harden({
    async executeOffer(spec) {
      const { result, payouts } = await executeOffer(
        zoe,
        when,
        spec,
        providePurse,
      );
      const refund: AmountKeywordRecord = await deeplyFulfilledObject(
        objectMap(payouts, async pmt => wallet.deposit(await pmt)),
      );
      return { result, payouts: refund };
    },
    async deposit(pmt) {
      const brand = await E(pmt).getAllegedBrand();
      const purse = providePurse(brand);
      return purse.deposit(pmt);
    },
  });
  return wallet;
};
