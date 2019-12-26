import { loadBasedir, buildVatController } from './controller';
import { buildMailboxStateMap, buildMailbox } from './devices/mailbox';
import { buildTimer } from './devices/timer';

import { buildStorageInMemory } from './hostStorage';
import buildCommand from './devices/command';

export {
  loadBasedir,
  buildVatController,
  buildMailboxStateMap,
  buildMailbox,
  buildTimer,
  buildStorageInMemory,
  buildCommand,
};

export function getVatTPSourcePath() {
  return require.resolve('./vats/vat-tp');
}

export function getCommsSourcePath() {
  return require.resolve('./vats/comms');
}

export function getTimerWrapperSourcePath() {
  return require.resolve('./vats/vat-timerWrapper');
}
