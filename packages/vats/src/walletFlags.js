// XXX domain of @agoric/cosmic-proto
import { keyMirror } from '@agoric/internal';

/**
 * non-exhaustive list of powerFlags REMOTE_WALLET is currently a default.
 *
 * See also MsgProvision in golang/cosmos/proto/agoric/swingset/msgs.proto
 */
export const PowerFlags = keyMirror({
  SMART_WALLET: null,
  /** The ag-solo wallet is remote. */
  REMOTE_WALLET: null,
});
