import test from 'ava';

/**
 * Andrew withdraws an exact principal amount from his Morpho position into his
 * Base account. With `withdraw.max` false or omitted, MovementDesc['amount']
 * refers to principal-token units. This differs from the full-exit journey:
 * execution withdraws the requested principal amount and may leave shares and
 * accrued yield in the position. The simulation should assert the transferred
 * principal and remaining shares, as well as the actors' causal messages.
 */
test.todo('withdraw an exact principal amount');
