import {
  loadBasedir,
  manageStateInBasedir,
  buildVatController,
} from './controller';
import { buildMailboxStateMap, buildMailbox } from './devices/mailbox';

export {
  loadBasedir,
  manageStateInBasedir,
  buildVatController,
  buildMailboxStateMap,
  buildMailbox,
};

export function getVatTPSourcePath() {
  return require.resolve('./vat-tp/vattp');
}
