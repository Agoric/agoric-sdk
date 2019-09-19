import { loadBasedir, buildVatController } from './controller';
import { buildMailboxStateMap, buildMailbox } from './devices/mailbox';
import { buildTimer } from './devices/timer';

export {
  loadBasedir,
  buildVatController,
  buildMailboxStateMap,
  buildMailbox,
  buildTimer,
};

export function getVatTPSourcePath() {
  return require.resolve('./vats/vat-tp/vattp');
}

export function getCommsSourcePath() {
  return require.resolve('./vats/comms');
}
