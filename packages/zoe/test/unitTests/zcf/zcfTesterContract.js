// @ts-check

import { E } from '@agoric/eventual-send';
import '../../../exported';

/**
 * Tests ZCF
 *
 * @type {ContractStartFn}
 */
const start = async zcf => {
  // make the `zcf` and `instance` available to the tests
  const invitation = zcf.makeInvitation(() => {}, 'test');
  const zoe = zcf.getZoeService();
  const { instance } = await E(zoe).getInvitationDetails(invitation);
  zcf.setTestJig(() => harden({ instance }));
  return {};
};

harden(start);
export { start };
