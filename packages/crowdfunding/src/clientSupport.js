// @ts-check

// XXX support other decimal places
const COSMOS_UNIT = 1_000_000n;
const scaleDecimals = num => BigInt(num * Number(COSMOS_UNIT));

/**
 * @satisfies {Record<
 *   string,
 *   Record<string, import('@agoric/smart-wallet/src/types.js').OfferMaker>
 * >}
 */
export const Offers = {
  crowdfunding: {
    /**
     * @param {Pick<
     *   import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes,
     *   'brand'
     * >} agoricNames
     * @param {{
     *   offerId: string;
     *   compensationBrandKey: string;
     *   compensation: number;
     * }} opts
     * @returns {import('@agoric/smart-wallet/src/offers.js').OfferSpec}
     */
    Provide: ({ brand }, opts) => {
      const proposal = {
        want: {
          Compensation: {
            brand:
              // @ts-expect-error BoardRemote not a Brand object
              /** @type {Brand<'nat'>} */
              (brand[opts.compensationBrandKey]),
            value: scaleDecimals(opts.compensation),
          },
        },
      };

      return {
        id: opts.offerId,
        invitationSpec: {
          source: 'agoricContract',
          instancePath: ['crowdfunding'],
          callPipe: [['makeProvisionInvitation', []]],
        },
        proposal,
      };
    },
    /**
     * @param {Pick<
     *   import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes,
     *   'brand'
     * >} agoricNames
     * @param {{
     *   offerId: string;
     *   compensationBrandKey: string;
     *   contribution: number;
     * }} opts
     * @returns {import('@agoric/smart-wallet/src/offers.js').OfferSpec}
     */
    Fund: ({ brand }, opts) => {
      const proposal = {
        give: {
          Contribution: {
            brand:
              // @ts-expect-error BoardRemote not a Brand object
              /** @type {Brand<'nat'>} */
              (brand[opts.compensationBrandKey]),
            value: scaleDecimals(opts.contribution),
          },
        },
      };

      return {
        id: opts.offerId,
        invitationSpec: {
          source: 'agoricContract',
          instancePath: ['crowdfunding'],
          callPipe: [['makeFundInvitation', []]],
        },
        proposal,
      };
    },
  },
};
