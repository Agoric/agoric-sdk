/**
 * @typedef {Object} PriceQuote
 * @property {Payment} quotePayment The quote wrapped as a payment
 * @property {Amount} quoteAmount Amount of `quotePayment` (`quoteIssuer.getAmountOf(quotePayment)`)
 */

/**
 * @typedef {Object} PriceQuoteValue An individual quote's value
 * @property {Amount} assetAmount The amount of the asset being quoted
 * @property {Amount} price The quoted price for the `assetAmount`
 * @property {TimerService} timer The service that gave the `timestamp`
 * @property {number} timestamp A timestamp for the quote according to `timer`
 * @property {any=} conditions Additional conditions for the quote
 */

/**
 * @typedef {Object} PriceAuthority An object that mints PriceQuotes and handles
 * triggers and notifiers for changes in the price
 * @property {(assetBrand: Brand, priceBrand: Brand) => ERef<Issuer>}
 * getQuoteIssuer Get the ERTP issuer of PriceQuotes
 * @property {(amountIn: Amount, brandOut: Brand) => Promise<PriceQuote>}
 * getInputPrice calculate the amount of brandOut that will be returned if the
 * amountIn is sold at the current price
 * @property {(amountOut: Amount, brandIn: Brand) => Promise<PriceQuote>}
 * getOutputPrice calculate the amount of brandIn that is required in order to
 * get amountOut using the current price
 * @property {(assetBrand: Brand, priceBrand: Brand) => ERef<Notifier<PriceQuote>>}
 * getPriceNotifier
 * @property {(timer: TimerService, deadline: number, assetAmount: Amount,
 * priceBrand: Brand) => Promise<PriceQuote>} priceAtTime Resolves after
 * `deadline` passes on `timer`  with the price of `assetAmount` at that time
 * @property {(assetAmount: Amount, priceLimit: Amount) => Promise<PriceQuote>}
 * priceWhenGT Resolve when the price of `assetAmount` exceeds `priceLimit`
 * @property {(assetAmount: Amount, priceLimit: Amount) => Promise<PriceQuote>}
 * priceWhenGTE Resolve when the price of `assetAmount` reaches or exceeds
 * `priceLimit`
 * @property {(assetAmount: Amount, priceLimit: Amount) => Promise<PriceQuote>}
 * priceWhenLTE Resolve when the price of `assetAmount` reaches or drops below
 * `priceLimit`
 * @property {(assetAmount: Amount, priceLimit: Amount) => Promise<PriceQuote>}
 * priceWhenLT Resolve when the price of `assetAmount` drops below `priceLimit`
 */
