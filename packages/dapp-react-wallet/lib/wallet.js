/* global harden */

// TODO: Don't just make this an adapter.
import { buildRootObject } from './vat-wallet';

function spawn(terms, _inviteMaker) {
  const walletVat = buildRootObject();
  return walletVat.startup(terms).then(_ => walletVat);
}

export default harden(spawn);
