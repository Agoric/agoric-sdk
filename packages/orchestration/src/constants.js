/**
 * @enum {(typeof HubName)[keyof typeof HubName]}
 */

export const HubName = /** @type {const} */ ({
  /** agoricNames key for ChainInfo hub */
  Chain: 'chain',
  /** namehub for assets info */
  ChainAssets: 'chainAssets',
  /** namehub for connection info */
  ChainConnection: 'chainConnection',
});
harden(HubName);
