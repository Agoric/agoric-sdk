export { loadBasedir, buildVatController } from './controller';
export { buildMailboxStateMap, buildMailbox } from './devices/mailbox';
export { buildTimer } from './devices/timer';

export { buildStorageInMemory } from './hostStorage';
export { default as buildCommand } from './devices/command';

export function getVatTPSourcePath() {
  return require.resolve('./vats/vat-tp');
}

export function getCommsSourcePath() {
  return require.resolve('./vats/comms');
}

export function getTimerWrapperSourcePath() {
  return require.resolve('./vats/vat-timerWrapper');
}
