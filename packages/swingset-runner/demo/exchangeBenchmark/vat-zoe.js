import { makeZoeKit } from '@agoric/zoe';
import { Far } from '@agoric/marshal';

export function buildRootObject(_vatPowers, vatParameters) {
  return Far('root', {
    buildZoe: vatAdminSvc => {
      const { zoeService: zoe } = makeZoeKit(
        vatAdminSvc,
        vatParameters.zcfBundleName,
      );
      return zoe;
    },
  });
}
