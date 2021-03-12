// @ts-check

// PriceAuthorities return quotes as a pair of an amount and a payment, both
// with the same value. The underlying amount wraps amountIn, amountOut, timer
// and timestamp. The payment is issued by the quoteIssuer to support veracity
// checking. These helpers make it easier to extract the components of the Quote

export const getAmountIn = quote => quote.quoteAmount.value[0].amountIn;
export const getAmountOut = quote => quote.quoteAmount.value[0].amountOut;
export const getTimestamp = quote => quote.quoteAmount.value[0].timestamp;
export const getQuoteValues = quote => quote.quoteAmount.value[0];
