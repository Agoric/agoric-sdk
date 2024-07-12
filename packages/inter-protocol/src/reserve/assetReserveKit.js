import { Fail, q } from '@endo/errors';
import { AmountMath, AmountShape, IssuerShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { M, makeScalarBigMapStore, prepareExoClassKit } from '@agoric/vat-data';
import { atomicTransfer } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import {
  makeRecorderTopic,
  TopicsRecordShape,
} from '@agoric/zoe/src/contractSupport/topics.js';
import { AmountKeywordRecordShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/eventual-send';
import { UnguardedHelperI } from '@agoric/internal/src/typeGuards.js';

const trace = makeTracer('ReserveKit', true);

/**
 * @import {TypedPattern} from '@agoric/internal';
 */

/**
 * @typedef {object} MetricsNotification
 * @property {AmountKeywordRecord} allocations
 * @property {Amount<'nat'>} shortfallBalance shortfall from liquidation that
 *   has not yet been compensated.
 * @property {Amount<'nat'>} totalFeeMinted total Fee tokens minted to date
 * @property {Amount<'nat'>} totalFeeBurned total Fee tokens burned to date
 */

/**
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {{
 *   feeMint: ZCFMint<'nat'>;
 *   makeRecorderKit: import('@agoric/zoe/src/contractSupport/recorder.js').MakeRecorderKit;
 *   storageNode: StorageNode;
 *   zcf: ZCF;
 * }} powers
 */
export const prepareAssetReserveKit = async (
  baggage,
  { feeMint, makeRecorderKit, storageNode, zcf },
) => {
  trace('prepareAssetReserveKit', [...baggage.keys()]);
  const feeKit = feeMint.getIssuerRecord();
  const emptyAmount = AmountMath.makeEmpty(feeKit.brand);

  const makeAssetReserveKitInternal = prepareExoClassKit(
    baggage,
    'AssetReserveKit',
    {
      helper: UnguardedHelperI,
      governedApis: M.interface('AssetReserve governedApis', {
        burnFeesToReduceShortfall: M.call(AmountShape).returns(),
      }),
      machine: M.interface('AssetReserve machine', {
        addIssuer: M.call(IssuerShape, M.string()).returns(M.promise()),
        getAllocations: M.call().returns(AmountKeywordRecordShape),
        makeShortfallReportingInvitation: M.call().returns(M.promise()),
      }),
      public: M.interface('AssetReserve public', {
        makeAddCollateralInvitation: M.call().returns(M.promise()),
        getPublicTopics: M.call().returns(TopicsRecordShape),
      }),
      shortfallReportingFacet: M.interface('AssetReserve shortfall reporter', {
        increaseLiquidationShortfall: M.call(AmountShape).returns(),
        reduceLiquidationShortfall: M.call(AmountShape).returns(),
      }),
    },
    /** @param {StorageNode} metricsNode */
    metricsNode => {
      /**
       * Used to look up the unique keyword for each brand, including Fee brand.
       *
       * @type {MapStore<Brand, Keyword>}
       */
      const keywordForBrand = makeScalarBigMapStore('keywordForBrand', {
        durable: true,
      });
      /**
       * Used to look up the brands for keywords, excluding Fee because it's a
       * special case.
       *
       * @type {MapStore<Keyword, Brand>}
       */
      const brandForKeyword = makeScalarBigMapStore('brandForKeyword', {
        durable: true,
      });

      return {
        brandForKeyword,
        // We keep the associated liquidity tokens in the same seat
        collateralSeat: zcf.makeEmptySeatKit().zcfSeat,
        keywordForBrand,
        metricsKit: makeRecorderKit(
          metricsNode,
          /** @type {TypedPattern<MetricsNotification>} */ (M.any()),
        ),
        totalFeeMinted: emptyAmount,
        totalFeeBurned: emptyAmount,
        shortfallBalance: emptyAmount,
      };
    },
    {
      helper: {
        /** @param {Brand} brand */
        getKeywordForBrand(brand) {
          const { keywordForBrand } = this.state;
          keywordForBrand.has(brand) ||
            Fail`Issuer not defined for brand ${q(
              brand,
            )}; first call addIssuer()`;
          return keywordForBrand.get(brand);
        },

        /**
         * @param {Brand} brand
         * @param {Keyword} keyword
         */
        saveBrandKeyword(brand, keyword) {
          trace('saveBrandKeyword', brand, keyword);
          const { keywordForBrand, brandForKeyword } = this.state;
          keywordForBrand.init(brand, keyword);
          brandForKeyword.init(keyword, brand);
        },

        writeMetrics() {
          const { state } = this;
          const metrics = harden({
            allocations: state.collateralSeat.getCurrentAllocation(),
            shortfallBalance: state.shortfallBalance,
            totalFeeMinted: state.totalFeeMinted,
            totalFeeBurned: state.totalFeeBurned,
          });
          void state.metricsKit.recorder.write(metrics);
        },
      },
      governedApis: {
        /**
         * @param {Amount<'nat'>} reduction
         * @returns {void}
         */
        burnFeesToReduceShortfall(reduction) {
          const { facets, state } = this;
          trace('burnFeesToReduceShortfall', reduction);
          reduction = AmountMath.coerce(feeKit.brand, reduction);
          const feeKeyword = state.keywordForBrand.get(feeKit.brand);
          const feeBalance = state.collateralSeat.getAmountAllocated(
            feeKeyword,
            feeKit.brand,
          );
          const amountToBurn = AmountMath.min(reduction, feeBalance);
          if (AmountMath.isEmpty(amountToBurn)) {
            return;
          }

          feeMint.burnLosses(
            harden({ [feeKeyword]: amountToBurn }),
            state.collateralSeat,
          );
          state.totalFeeBurned = AmountMath.add(
            state.totalFeeBurned,
            amountToBurn,
          );
          facets.helper.writeMetrics();
        },
      },
      machine: {
        // add makeRedeemLiquidityTokensInvitation later. For now just store them
        /**
         * @param {Issuer} issuer
         * @param {string} keyword
         */
        async addIssuer(issuer, keyword) {
          const brand = await E(issuer).getBrand();
          trace('addIssuer', { brand, keyword });
          assert(
            keyword !== 'Fee' && brand !== feeKit.brand,
            `'Fee' brand is a special case handled by the reserve contract`,
          );

          trace('addIssuer storing', {
            keyword,
            brand,
          });

          this.facets.helper.saveBrandKeyword(brand, keyword);
          await zcf.saveIssuer(issuer, keyword);
        },

        /** XXX redundant with getPublicTopics metrics `allocation` */
        getAllocations() {
          return this.state.collateralSeat.getCurrentAllocation();
        },

        makeShortfallReportingInvitation() {
          const { facets } = this;
          const handleShortfallReportingOffer = () => {
            return facets.shortfallReportingFacet;
          };

          return zcf.makeInvitation(
            handleShortfallReportingOffer,
            'getFacetForReportingShortfalls',
          );
        },
      },
      /**
       * XXX missing governance public methods
       * https://github.com/Agoric/agoric-sdk/issues/5200
       */
      public: {
        /** Anyone can deposit any assets to the reserve */
        makeAddCollateralInvitation() {
          /** @type {OfferHandler<Promise<string>>} */
          const handler = async seat => {
            const {
              give: { Collateral: amountIn },
            } = seat.getProposal();
            const { facets, state } = this;
            const { helper } = facets;

            const collateralKeyword = helper.getKeywordForBrand(amountIn.brand);

            atomicTransfer(
              zcf,
              seat,
              state.collateralSeat,
              { Collateral: amountIn },
              { [collateralKeyword]: amountIn },
            );
            seat.exit();
            helper.writeMetrics();

            trace('received collateral', amountIn);
            return 'added Collateral to the Reserve';
          };
          return zcf.makeInvitation(handler, 'Add Collateral');
        },
        getPublicTopics() {
          return {
            metrics: makeRecorderTopic(
              'Asset Reserve metrics',
              this.state.metricsKit,
            ),
          };
        },
      },
      shortfallReportingFacet: {
        /** @param {Amount<'nat'>} shortfall */
        increaseLiquidationShortfall(shortfall) {
          const { facets, state } = this;
          state.shortfallBalance = AmountMath.add(
            state.shortfallBalance,
            shortfall,
          );
          facets.helper.writeMetrics();
        },

        // currently exposed for testing. Maybe it only gets called internally?
        /** @param {Amount<'nat'>} reduction */
        reduceLiquidationShortfall(reduction) {
          const { state } = this;
          if (AmountMath.isGTE(reduction, state.shortfallBalance)) {
            state.shortfallBalance = emptyAmount;
          } else {
            state.shortfallBalance = AmountMath.subtract(
              state.shortfallBalance,
              reduction,
            );
          }
          this.facets.helper.writeMetrics();
        },
      },
    },
    {
      finish: ({ facets: { helper } }) => {
        // no need to saveIssuer() b/c registerFeeMint did it
        helper.saveBrandKeyword(feeKit.brand, 'Fee');

        helper.writeMetrics();
      },
    },
  );

  const makeAssetReserveKit = async () => {
    const metricsNode = await E(storageNode).makeChildNode('metrics');
    return makeAssetReserveKitInternal(metricsNode);
  };
  return makeAssetReserveKit;
};
harden(prepareAssetReserveKit);
/** @typedef {ReturnType<Awaited<ReturnType<typeof prepareAssetReserveKit>>>} AssetReserveKit */
