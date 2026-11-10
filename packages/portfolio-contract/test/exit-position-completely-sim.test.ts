import test from 'ava';

/**
 * Andrew withdraws an exact principal amount from his Morpho position into his
 * Base account. The movement omits `amountOfShares`, and `withdraw.max` is
 * false or omitted, so MovementDesc['amount'] refers to principal-token units
 * rather than a raw share count. This differs from the full-exit journey:
 * execution withdraws the requested principal amount and may leave shares and
 * accrued yield in the position. The simulation should assert the transferred
 * principal and remaining shares, as well as the actors' causal messages.
 */
test.todo('withdraw an exact principal amount without amountOfShares');
