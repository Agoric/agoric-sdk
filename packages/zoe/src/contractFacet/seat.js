import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

export const makeZcfSeatAdminKit = zoeSeatAdmin => {
  /** @type {ZCFSeat} */
  const zcfSeat = Far('zcfSeat', {
    exit: completion => {
      E(zoeSeatAdmin).exit(completion);
    },
  });

  return harden({ zcfSeat });
};
