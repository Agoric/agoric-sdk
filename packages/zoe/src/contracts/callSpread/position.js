/**
 * Constants for long and short positions.
 *
 * @type {{ LONG: 'long', SHORT: 'short' }}
 */
export const Position = {
  LONG: 'long',
  SHORT: 'short',
};

export const getOtherPosition = position => {
  return position === Position.LONG ? Position.SHORT : Position.LONG;
};