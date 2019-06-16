import {
  loadBasedir,
  useStorageInBasedir,
  buildVatController,
} from './controller';
import { buildMailboxStateMap, buildMailbox } from './devices/mailbox';

export {
  loadBasedir,
  useStorageInBasedir,
  buildVatController,
  buildMailboxStateMap,
  buildMailbox,
};

export function getVatTPSourcePath() {
  return require.resolve('./vat-tp/vattp');
}
