// XXX domain of @agoric/cosmic-proto
/**
 * non-exhaustive list of powerFlags REMOTE_WALLET is currently a default.
 *
 * See also MsgProvision in golang/cosmos/proto/agoric/swingset/msgs.proto
 */
export const PowerFlags = /** @type {const} */ ({
  SMART_WALLET: 'SMART_WALLET',
  /** The ag-solo wallet is remote. */
  REMOTE_WALLET: 'REMOTE_WALLET',
});
