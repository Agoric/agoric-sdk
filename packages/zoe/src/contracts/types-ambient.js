/**
 * @typedef {object} SellItemsPublicFacet
 * @property {() => Issuer} getItemsIssuer
 * @property {() => Amount} getAvailableItems
 *
 * @typedef {object} SellItemsCreatorOnly
 * @property {() => Promise<Invitation>} makeBuyerInvitation
 *
 * @typedef {SellItemsPublicFacet & SellItemsCreatorOnly} SellItemsCreatorFacet
 */

/**
 * @typedef {object} SellItemsParameters
 * @property {Record<string, any>} customValueProperties
 * @property {number} count
 * @property {Issuer} moneyIssuer
 * @property {Installation} sellItemsInstallation
 * @property {Amount} pricePerItem
 *
 * @typedef {object} SellItemsResult
 * @property {UserSeat} sellItemsCreatorSeat
 * @property {SellItemsCreatorFacet} sellItemsCreatorFacet
 * @property {Instance} sellItemsInstance
 * @property {SellItemsPublicFacet} sellItemsPublicFacet
 *
 * @typedef {object} MintAndSellNFTCreatorFacet
 * @property {(sellParams: SellItemsParameters) => Promise<SellItemsResult>} sellTokens
 * @property {() => Issuer} getIssuer
 */

/**
 * @typedef {object} AutomaticRefundPublicFacet
 * @property {() => bigint} getOffersCount
 * @property {() => Promise<Invitation>} makeInvitation
 */

/**
 * @typedef {object} AutoswapPublicFacet
 * @property {() => Promise<Invitation>} makeSwapInvitation synonym for
 * makeSwapInInvitation
 * @property {() => Promise<Invitation>} makeSwapInInvitation make an invitation
 * that allows one to do a swap in which the In amount is specified and the Out
 * amount is calculated
 * @property {() => Promise<Invitation>} makeSwapOutInvitation make an invitation
 * that allows one to do a swap in which the Out amount is specified and the In
 * amount is calculated
 * @property {() => Promise<Invitation>} makeAddLiquidityInvitation make an
 * invitation that allows one to add liquidity to the pool.
 * @property {() => Promise<Invitation>} makeRemoveLiquidityInvitation make an
 * invitation that allows one to remove liquidity from the pool.
 * @property {() => Issuer} getLiquidityIssuer
 * @property {() => bigint} getLiquiditySupply get the current value of
 * liquidity held by investors.
 * @property {(amountIn: Amount, brandOut: Brand) => Amount} getInputPrice
 * calculate the amount of brandOut that will be returned if the amountIn is
 * offered using makeSwapInInvitation at the current price.
 * @property {(amountOut: Amount, brandIn: Brand) => Amount} getOutputPrice
 * calculate the amount of brandIn that is required in order to get amountOut
 * using makeSwapOutInvitation at the current price
 * @property {() => Record<string, Amount>} getPoolAllocation get an
 * AmountKeywordRecord showing the current balances in the pool.
 */
