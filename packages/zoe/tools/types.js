/**
 * @typedef {Object} TimerService Gives the ability to get the current time,
 * schedule a single wake() call, create a repeater that will allow scheduling
 * of events at regular intervals, or remove scheduled calls.
 * @property {() => Timestamp} getCurrentTimestamp Retrieve the latest timestamp
 * @property {(baseTime: Timestamp, waker: TimerWaker) => Timestamp} setWakeup Return
 * value is the time at which the call is scheduled to take place
 * @property {(waker: TimerWaker) => Array<Timestamp>} removeWakeup Remove the waker
 * from all its scheduled wakeups, whether produced by `timer.setWakeup(h)` or
 * `repeater.schedule(h)`.
 * @property {(delaySecs: RelativeTime, interval: RelativeTime) => TimerRepeater} createRepeater
 * Create and return a repeater that will schedule `wake()` calls
 * repeatedly at times that are a multiple of interval following delay.
 * Interval is the difference between successive times at which wake will be
 * called.  When `schedule(w)` is called, `w.wake()` will be scheduled to be
 * called after the next multiple of interval from the base. Since times can be
 * coarse-grained, the actual call may occur later, but this won't change when
 * the next event will be called.
 * @property {(delaySecs: RelativeTime, interval: RelativeTime) => Notifier<Timestamp>} createNotifier
 * Create and return a Notifer that will deliver updates repeatedly at times
 * that are a multiple of interval following delay.
 */

/**
 * @typedef {number} Timestamp An absolute individual stamp returned by a
 * TimerService.  Note that different timer services may have different
 * interpretations of actual Timestamp values.
 * @typedef {number} RelativeTime Difference between two Timestamps.  Note that
 * different timer services may have different interpretations of actual
 * RelativeTime values.
 */

/**
 * @typedef {Object} TimerWaker
 * @property {(timestamp: Timestamp) => void} wake The timestamp passed to
 * `wake()` is the time that the call was scheduled to occur.
 */

/**
 * @typedef {Object} TimerRepeater
 * @property {(waker: TimerWaker) => void} schedule Returns the time scheduled for
 * the first call to `E(waker).wake()`.  The waker will continue to be scheduled
 * every interval until the repeater is disabled.
 * @property {() => void} disable Disable this repeater, so `schedule(w)` can't
 * be called, and wakers already scheduled with this repeater won't be
 * rescheduled again after `E(waker).wake()` is next called on them.
 */

/**
 * @typedef {Object} PriceQuote
 * @property {Amount} quoteAmount Amount whose value is a PriceQuoteValue
 * @property {ERef<Payment> | null} quotePayment The `quoteAmount` wrapped as a payment
 */

/**
 * @typedef {[PriceDescription]} PriceQuoteValue A single-valued set of
 * PriceDescriptions.  This is the `value` in PriceQuote.quoteAmount (`{ brand,
 * value: PriceQuoteValue }`).
 */

/**
 * @typedef {Object} PriceDescription A description of a single quote
 * @property {Amount} amountIn The amount supplied to a trade
 * @property {Amount} amountOut The quoted result of trading `amountIn`
 * @property {TimerService} timer The service that gave the `timestamp`
 * @property {Timestamp} timestamp A timestamp according to `timer` for the
 * quote
 * @property {any=} conditions Additional conditions for the quote
 */

/**
 * @callback PriceQuoteCreate
 * @param {PriceQuery} priceQuery
 * @returns {ERef<PriceQuote> | undefined}
 */

/**
 * @callback PriceQuoteTrigger
 * @param {PriceQuoteCreate} createQuote
 */

/**
 * @typedef {Object} PriceAuthorityAdmin
 * @property {(createQuote: PriceQuoteCreate) => Promise<void>} fireTriggers
 */

/**
 * @typedef {Object} PriceAuthorityKit
 * @property {PriceAuthority} priceAuthority
 * @property {PriceAuthorityAdmin} adminFacet
 */

/**
 * @typedef {Object} PriceAuthority An object that mints PriceQuotes and handles
 * triggers and notifiers for changes in the price
 *
 * @property {(brandIn: Brand, brandOut: Brand) => ERef<Issuer>} getQuoteIssuer
 * Get the ERTP issuer of PriceQuotes for a given brandIn/brandOut pair
 *
 * @property {(brandIn: Brand, brandOut: Brand) => ERef<TimerService>}
 * getTimerService get the timer used in PriceQuotes for a given
 * brandIn/brandOut pair
 *
 * @property {(amountIn: Amount, brandOut: Brand) => ERef<Notifier<PriceQuote>>}
 * makeQuoteNotifier Be notified of the latest PriceQuotes for a given
 * `amountIn`.  The rate at which these are issued may be very different between
 * `priceAuthorities`.
 *
 * @property {(deadline: Timestamp, amountIn: Amount, brandOut: Brand) =>
 * Promise<PriceQuote>} quoteAtTime Resolves after `deadline` passes on the
 * priceAuthority's timerService with the price quote of `amountIn` at that time
 *
 * @property {(amountIn: Amount, brandOut: Brand) => Promise<PriceQuote>}
 * quoteGiven get a quote corresponding to the specified amountIn
 *
 * @property {(brandIn: Brand, amountOut: Amount) => Promise<PriceQuote>}
 * quoteWanted get a quote corresponding to the specified amountOut
 *
 * @property {(amountIn: Amount, amountOutLimit: Amount) => Promise<PriceQuote>}
 * quoteWhenGT Resolve when a price quote of `amountIn` exceeds `amountOutLimit`
 *
 * @property {(amountIn: Amount, amountOutLimit: Amount) => Promise<PriceQuote>}
 * quoteWhenGTE Resolve when a price quote of `amountIn` reaches or exceeds
 * `amountOutLimit`
 *
 * @property {(amountIn: Amount, amountOutLimit: Amount) => Promise<PriceQuote>}
 * quoteWhenLTE Resolve when a price quote of `amountIn` reaches or drops below
 * `amountOutLimit`
 *
 * @property {(amountIn: Amount, amountOutLimit: Amount) => Promise<PriceQuote>}
 * quoteWhenLT Resolve when the price quote of `amountIn` drops below
 * `amountOutLimit`
 */

/**
 * @typedef {(amount: Amount) => Amount} PriceCalculator
 */

/**
 * @callback PriceQuery
 * @param {PriceCalculator} calcAmountIn
 * @param {PriceCalculator} calcAmountOut
 * @returns {{ amountIn: Amount, amountOut: Amount, timestamp?: Timestamp }=}
 */
