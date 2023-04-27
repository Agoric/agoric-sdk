import { Far } from '@endo/marshal';

import { makeZoeKit } from '../../../src/zoeService/zoe.js';

export function buildRootObject(vatPowers, vatParams, baggage) {
  const shutdownZoeVat = vatPowers.exitVatWithFailure;

  // define all the durable kinds
  const { zoeService, setVatAdminService } = makeZoeKit(
    undefined,
    shutdownZoeVat,
    undefined,
    undefined,
    baggage,
  );

  return Far('root', {
    buildZoe: vatAdminSvc => {
      setVatAdminService(vatAdminSvc);
      return zoeService;
    },
  });
}
